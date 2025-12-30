"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import {
  createInitiativeSchema,
  updateInitiativeSchema,
  initiativeFiltersSchema,
  type CreateInitiativeInput,
  type UpdateInitiativeInput,
  type InitiativeFilters,
} from "@/lib/validations/initiative";
import type { Initiative, InitiativeVersion, InitiativeTemplate } from "@prisma/client";

export type InitiativeWithDetails = Initiative & {
  owner: { id: string; name: string | null; email: string };
  template: InitiativeTemplate | null;
  versions: InitiativeVersion[];
  _count: { versions: number };
};

/**
 * Get paginated list of initiatives for the current user's organization
 */
export async function getInitiatives(filters: Partial<InitiativeFilters> = {}) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validatedFilters = initiativeFiltersSchema.parse(filters);
  const { page, limit, sortBy, sortOrder, status, templateId, ownerId, search } = validatedFilters;

  const where = {
    orgId: user.orgId,
    ...(status && status.length > 0 && { status: { in: status } }),
    ...(templateId && { templateId }),
    ...(ownerId && { ownerId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [initiatives, total] = await Promise.all([
    prisma.initiative.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        template: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { versions: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.initiative.count({ where }),
  ]);

  return {
    initiatives: initiatives as InitiativeWithDetails[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single initiative by ID
 */
export async function getInitiative(id: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const initiative = await prisma.initiative.findFirst({
    where: {
      id,
      orgId: user.orgId,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      template: true,
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lockedBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              driverValues: true,
              scenarios: true,
              comments: true,
            },
          },
        },
      },
      userRoles: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!initiative) {
    throw new Error("Initiative not found");
  }

  return initiative;
}

/**
 * Create a new initiative
 */
export async function createInitiative(input: CreateInitiativeInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = createInitiativeSchema.parse(input);

  // Create initiative with initial version
  const initiative = await prisma.$transaction(async (tx) => {
    // Create the initiative
    const newInitiative = await tx.initiative.create({
      data: {
        orgId: user.orgId!,
        title: validated.title,
        description: validated.description,
        templateId: validated.templateId,
        ownerId: user.id,
        status: "DRAFT",
        tags: validated.tags,
      },
    });

    // Create initial version
    const version = await tx.initiativeVersion.create({
      data: {
        initiativeId: newInitiative.id,
        versionLabel: "v0.1",
        state: "DRAFT",
        createdById: user.id,
        notes: "Initial draft",
      },
    });

    // If template is specified, populate default driver values
    if (validated.templateId) {
      const template = await tx.initiativeTemplate.findUnique({
        where: { id: validated.templateId },
      });

      if (template && template.defaultDrivers) {
        const defaultDrivers = template.defaultDrivers as Record<string, unknown>;
        const driverValues = Object.entries(defaultDrivers).map(([key, value]) => ({
          versionId: version.id,
          driverKey: key,
          value: value,
          source: "MANUAL" as const,
          enteredById: user.id,
        }));

        if (driverValues.length > 0) {
          await tx.driverValue.createMany({ data: driverValues });
        }
      }
    }

    // Create baseline scenario
    await tx.scenario.create({
      data: {
        versionId: version.id,
        name: "Base Case",
        isBaseline: true,
        overrides: {},
      },
    });

    return newInitiative;
  });

  // Create audit event
  await createAuditEvent({
    action: "INITIATIVE_CREATED",
    resourceType: "Initiative",
    resourceId: initiative.id,
    newValue: {
      title: initiative.title,
      templateId: initiative.templateId,
    },
  });

  revalidatePath("/initiatives");

  return initiative;
}

/**
 * Update an initiative
 */
export async function updateInitiative(id: string, input: UpdateInitiativeInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = updateInitiativeSchema.parse(input);

  // Verify ownership/access
  const existing = await prisma.initiative.findFirst({
    where: { id, orgId: user.orgId },
  });

  if (!existing) {
    throw new Error("Initiative not found");
  }

  // Check if user can edit (owner, admin, or editor)
  const canEdit =
    existing.ownerId === user.id ||
    user.orgRole === "ADMIN" ||
    user.orgRole === "EDITOR";

  if (!canEdit) {
    throw new Error("You don't have permission to edit this initiative");
  }

  const initiative = await prisma.initiative.update({
    where: { id },
    data: {
      ...(validated.title && { title: validated.title }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.status && { status: validated.status }),
      ...(validated.tags && { tags: validated.tags }),
    },
  });

  await createAuditEvent({
    action: "INITIATIVE_UPDATED",
    resourceType: "Initiative",
    resourceId: id,
    oldValue: existing,
    newValue: validated,
  });

  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/initiatives");

  return initiative;
}

/**
 * Delete an initiative
 */
export async function deleteInitiative(id: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const existing = await prisma.initiative.findFirst({
    where: { id, orgId: user.orgId },
  });

  if (!existing) {
    throw new Error("Initiative not found");
  }

  // Only owner or admin can delete
  if (existing.ownerId !== user.id && user.orgRole !== "ADMIN") {
    throw new Error("You don't have permission to delete this initiative");
  }

  await prisma.initiative.delete({ where: { id } });

  await createAuditEvent({
    action: "INITIATIVE_DELETED",
    resourceType: "Initiative",
    resourceId: id,
    oldValue: { title: existing.title },
  });

  revalidatePath("/initiatives");

  return { success: true };
}

/**
 * Get all available templates
 */
export async function getTemplates() {
  const user = await requireAuth();

  const templates = await prisma.initiativeTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { orgId: null }, // System templates
        { orgId: user.orgId }, // Org-specific templates
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  return templates;
}

/**
 * Get driver definitions for a template or all available
 */
export async function getDriverDefinitions(templateId?: string) {
  const user = await requireAuth();

  let driverKeys: string[] | undefined;

  if (templateId) {
    const template = await prisma.initiativeTemplate.findUnique({
      where: { id: templateId },
    });

    if (template) {
      driverKeys = [
        ...template.requiredDrivers,
        ...template.optionalDrivers,
      ];
    }
  }

  const drivers = await prisma.driverDefinition.findMany({
    where: {
      isActive: true,
      OR: [
        { orgId: null },
        { orgId: user.orgId },
      ],
      ...(driverKeys && { key: { in: driverKeys } }),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return drivers;
}
