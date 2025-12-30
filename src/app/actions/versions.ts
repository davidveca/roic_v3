"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent, canPerformInitiativeAction } from "@/lib/auth-utils";
import {
  createVersionSchema,
  updateVersionStateSchema,
  updateDriverValuesSchema,
  createScenarioSchema,
  updateScenarioSchema,
  type CreateVersionInput,
  type UpdateVersionStateInput,
  type UpdateDriverValuesInput,
  type CreateScenarioInput,
  type UpdateScenarioInput,
} from "@/lib/validations/initiative";

/**
 * Get a specific version with all its data
 */
export async function getVersion(versionId: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: versionId,
      initiative: { orgId: user.orgId },
    },
    include: {
      initiative: {
        include: {
          template: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      lockedBy: { select: { id: true, name: true, email: true } },
      driverValues: {
        include: {
          enteredBy: { select: { id: true, name: true, email: true } },
        },
      },
      scenarios: {
        include: {
          results: {
            orderBy: { period: "asc" },
          },
        },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, email: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, email: true } },
            },
          },
        },
        where: { parentId: null }, // Only top-level comments
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  return version;
}

/**
 * Create a new version (optionally copying from existing)
 */
export async function createVersion(input: CreateVersionInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = createVersionSchema.parse(input);

  // Verify access
  const canEdit = await canPerformInitiativeAction(validated.initiativeId, "edit");
  if (!canEdit) {
    throw new Error("You don't have permission to create versions for this initiative");
  }

  // Get existing versions to determine next version label
  const existingVersions = await prisma.initiativeVersion.findMany({
    where: { initiativeId: validated.initiativeId },
    orderBy: { createdAt: "desc" },
    select: { versionLabel: true },
  });

  // Generate next version label
  let nextVersion = validated.versionLabel;
  if (!nextVersion) {
    const lastVersion = existingVersions[0]?.versionLabel ?? "v0.0";
    const match = lastVersion.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      nextVersion = `v${major}.${minor + 1}`;
    } else {
      nextVersion = `v0.${existingVersions.length + 1}`;
    }
  }

  // Create version with optional copy of driver values and scenarios
  const version = await prisma.$transaction(async (tx) => {
    const newVersion = await tx.initiativeVersion.create({
      data: {
        initiativeId: validated.initiativeId,
        versionLabel: nextVersion!,
        state: "DRAFT",
        createdById: user.id,
        notes: validated.notes,
      },
    });

    // Copy from existing version if specified
    if (validated.copyFromVersionId) {
      const sourceVersion = await tx.initiativeVersion.findUnique({
        where: { id: validated.copyFromVersionId },
        include: {
          driverValues: true,
          scenarios: true,
        },
      });

      if (sourceVersion) {
        // Copy driver values
        if (sourceVersion.driverValues.length > 0) {
          await tx.driverValue.createMany({
            data: sourceVersion.driverValues.map((dv) => ({
              versionId: newVersion.id,
              driverKey: dv.driverKey,
              value: dv.value,
              source: dv.source,
              enteredById: dv.enteredById,
              notes: dv.notes,
            })),
          });
        }

        // Copy scenarios
        if (sourceVersion.scenarios.length > 0) {
          await tx.scenario.createMany({
            data: sourceVersion.scenarios.map((s) => ({
              versionId: newVersion.id,
              name: s.name,
              isBaseline: s.isBaseline,
              overrides: s.overrides,
            })),
          });
        }
      }
    } else {
      // Create default baseline scenario
      await tx.scenario.create({
        data: {
          versionId: newVersion.id,
          name: "Base Case",
          isBaseline: true,
          overrides: {},
        },
      });
    }

    // Mark previous draft versions as superseded
    await tx.initiativeVersion.updateMany({
      where: {
        initiativeId: validated.initiativeId,
        id: { not: newVersion.id },
        state: "DRAFT",
      },
      data: { state: "SUPERSEDED" },
    });

    return newVersion;
  });

  await createAuditEvent({
    action: "VERSION_CREATED",
    resourceType: "InitiativeVersion",
    resourceId: version.id,
    newValue: {
      versionLabel: version.versionLabel,
      copiedFrom: validated.copyFromVersionId,
    },
  });

  revalidatePath(`/initiatives/${validated.initiativeId}`);

  return version;
}

/**
 * Update version state (for approval workflow)
 */
export async function updateVersionState(input: UpdateVersionStateInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = updateVersionStateSchema.parse(input);

  const existingVersion = await prisma.initiativeVersion.findFirst({
    where: {
      id: validated.versionId,
      initiative: { orgId: user.orgId },
    },
    include: { initiative: true },
  });

  if (!existingVersion) {
    throw new Error("Version not found");
  }

  // State transition rules
  const validTransitions: Record<string, string[]> = {
    DRAFT: ["IN_REVIEW", "SUPERSEDED"],
    IN_REVIEW: ["DRAFT", "APPROVED", "SUPERSEDED"],
    APPROVED: ["SUPERSEDED"], // Can only be superseded by new version
    SUPERSEDED: [], // Terminal state
  };

  if (!validTransitions[existingVersion.state]?.includes(validated.state)) {
    throw new Error(
      `Cannot transition from ${existingVersion.state} to ${validated.state}`
    );
  }

  // Check permissions
  if (validated.state === "APPROVED") {
    // Only finance or admin can approve
    if (!["ADMIN", "FINANCE"].includes(user.orgRole)) {
      throw new Error("Only Finance or Admin can approve versions");
    }
  }

  const version = await prisma.initiativeVersion.update({
    where: { id: validated.versionId },
    data: {
      state: validated.state,
      notes: validated.notes ?? existingVersion.notes,
      ...(validated.state === "APPROVED" && {
        lockedAt: new Date(),
        lockedById: user.id,
      }),
    },
  });

  await createAuditEvent({
    action: `VERSION_${validated.state}`,
    resourceType: "InitiativeVersion",
    resourceId: version.id,
    oldValue: { state: existingVersion.state },
    newValue: { state: validated.state },
  });

  revalidatePath(`/initiatives/${existingVersion.initiativeId}`);

  return version;
}

/**
 * Update driver values for a version
 */
export async function updateDriverValues(input: UpdateDriverValuesInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = updateDriverValuesSchema.parse(input);

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: validated.versionId,
      initiative: { orgId: user.orgId },
    },
    include: { initiative: true },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // Can only update draft versions
  if (version.state !== "DRAFT") {
    throw new Error("Cannot update a locked version");
  }

  // Upsert each driver value
  const updates = await prisma.$transaction(
    validated.values.map((dv) =>
      prisma.driverValue.upsert({
        where: {
          versionId_driverKey: {
            versionId: validated.versionId,
            driverKey: dv.driverKey,
          },
        },
        create: {
          versionId: validated.versionId,
          driverKey: dv.driverKey,
          value: dv.value,
          source: dv.source ?? "MANUAL",
          enteredById: user.id,
          notes: dv.notes,
        },
        update: {
          value: dv.value,
          source: dv.source ?? "MANUAL",
          enteredById: user.id,
          notes: dv.notes,
        },
      })
    )
  );

  await createAuditEvent({
    action: "DRIVER_VALUES_UPDATED",
    resourceType: "InitiativeVersion",
    resourceId: validated.versionId,
    newValue: { driversUpdated: validated.values.length },
  });

  revalidatePath(`/initiatives/${version.initiativeId}`);

  return updates;
}

/**
 * Create a new scenario
 */
export async function createScenario(input: CreateScenarioInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = createScenarioSchema.parse(input);

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: validated.versionId,
      initiative: { orgId: user.orgId },
    },
    include: { initiative: true },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // If setting as baseline, unset other baselines
  if (validated.isBaseline) {
    await prisma.scenario.updateMany({
      where: { versionId: validated.versionId },
      data: { isBaseline: false },
    });
  }

  const scenario = await prisma.scenario.create({
    data: {
      versionId: validated.versionId,
      name: validated.name,
      isBaseline: validated.isBaseline,
      overrides: validated.overrides,
    },
  });

  await createAuditEvent({
    action: "SCENARIO_CREATED",
    resourceType: "Scenario",
    resourceId: scenario.id,
    newValue: { name: scenario.name },
  });

  revalidatePath(`/initiatives/${version.initiativeId}`);

  return scenario;
}

/**
 * Update a scenario
 */
export async function updateScenario(scenarioId: string, input: UpdateScenarioInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = updateScenarioSchema.parse(input);

  const existing = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      version: {
        initiative: { orgId: user.orgId },
      },
    },
    include: {
      version: { include: { initiative: true } },
    },
  });

  if (!existing) {
    throw new Error("Scenario not found");
  }

  const scenario = await prisma.scenario.update({
    where: { id: scenarioId },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.overrides && { overrides: validated.overrides }),
    },
  });

  await createAuditEvent({
    action: "SCENARIO_UPDATED",
    resourceType: "Scenario",
    resourceId: scenario.id,
    oldValue: { name: existing.name, overrides: existing.overrides },
    newValue: validated,
  });

  revalidatePath(`/initiatives/${existing.version.initiativeId}`);

  return scenario;
}

/**
 * Delete a scenario
 */
export async function deleteScenario(scenarioId: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const existing = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      version: {
        initiative: { orgId: user.orgId },
      },
    },
    include: {
      version: { include: { initiative: true } },
    },
  });

  if (!existing) {
    throw new Error("Scenario not found");
  }

  // Cannot delete baseline scenario
  if (existing.isBaseline) {
    throw new Error("Cannot delete the baseline scenario");
  }

  await prisma.scenario.delete({ where: { id: scenarioId } });

  await createAuditEvent({
    action: "SCENARIO_DELETED",
    resourceType: "Scenario",
    resourceId: scenarioId,
    oldValue: { name: existing.name },
  });

  revalidatePath(`/initiatives/${existing.version.initiativeId}`);

  return { success: true };
}
