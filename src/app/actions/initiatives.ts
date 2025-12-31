"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  requireAuth,
  createAuditEvent,
  getAccessibleInitiativesFilter,
  canAccessInitiative,
  canEditInitiative,
  isInitiativeOwner,
} from "@/lib/auth-utils";
import {
  createInitiativeSchema,
  updateInitiativeSchema,
  initiativeFiltersSchema,
  type CreateInitiativeInput,
  type UpdateInitiativeInput,
  type InitiativeFilters,
} from "@/lib/validations/initiative";
import { Prisma } from "@prisma/client";
import type {
  Initiative,
  InitiativeVersion,
  InitiativeTemplate,
  InitiativeType,
} from "@prisma/client";

export type InitiativeWithDetails = Initiative & {
  owner: { id: string; name: string | null; email: string };
  template: InitiativeTemplate | null;
  versions: (InitiativeVersion & {
    scenarios?: {
      id: string;
      name: string;
      isBaseline: boolean;
      results: { metrics: Record<string, unknown> }[];
    }[];
  })[];
  _count: { versions: number };
};

/**
 * Get paginated list of initiatives accessible to the current user
 */
export async function getInitiatives(
  filters: Partial<InitiativeFilters> = {}
) {
  await requireAuth();

  const validatedFilters = initiativeFiltersSchema.parse(filters);
  const { page, limit, sortBy, sortOrder, status, templateId, type, isPublic, search } =
    validatedFilters;

  // Get access filter based on user's email (owner, collaborator, or public)
  const accessFilter = await getAccessibleInitiativesFilter();

  const where = {
    AND: [
      accessFilter,
      ...(status && status.length > 0 ? [{ status: { in: status } }] : []),
      ...(templateId ? [{ templateId }] : []),
      ...(type ? [{ type }] : []),
      ...(isPublic !== undefined ? [{ isPublic }] : []),
      ...(search
        ? [
            {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                {
                  description: { contains: search, mode: "insensitive" as const },
                },
              ],
            },
          ]
        : []),
    ],
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
          include: {
            scenarios: {
              where: { isBaseline: true },
              take: 1,
              include: {
                results: {
                  where: { period: 0 }, // period 0 = summary
                  take: 1,
                  orderBy: { computedAt: "desc" },
                },
              },
            },
          },
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
  await requireAuth();

  // Check access
  const hasAccess = await canAccessInitiative(id);
  if (!hasAccess) {
    throw new Error("Initiative not found or access denied");
  }

  const initiative = await prisma.initiative.findUnique({
    where: { id },
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

  const validated = createInitiativeSchema.parse(input);

  // Create initiative with initial version
  const initiative = await prisma.$transaction(async (tx) => {
    // Create the initiative with owner info
    const newInitiative = await tx.initiative.create({
      data: {
        title: validated.title,
        description: validated.description,
        templateId: validated.templateId,
        ownerId: user.id,
        ownerEmail: user.email,
        type: validated.type as InitiativeType,
        isPublic: validated.isPublic,
        collaboratorEmails: validated.collaboratorEmails,
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
        const defaultDrivers = template.defaultDrivers as Record<
          string,
          unknown
        >;
        const driverValues = Object.entries(defaultDrivers).map(
          ([key, value]) => ({
            versionId: version.id,
            driverKey: key,
            value: value as Prisma.InputJsonValue,
            source: "MANUAL" as const,
            enteredById: user.id,
          })
        );

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
      type: initiative.type,
      templateId: initiative.templateId,
    },
  });

  revalidatePath("/initiatives");

  return initiative;
}

/**
 * Update an initiative
 */
export async function updateInitiative(
  id: string,
  input: UpdateInitiativeInput
) {
  await requireAuth();

  const validated = updateInitiativeSchema.parse(input);

  // Check edit permission
  const canEdit = await canEditInitiative(id);
  if (!canEdit) {
    throw new Error("You don't have permission to edit this initiative");
  }

  const existing = await prisma.initiative.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Initiative not found");
  }

  const initiative = await prisma.initiative.update({
    where: { id },
    data: {
      ...(validated.title && { title: validated.title }),
      ...(validated.description !== undefined && {
        description: validated.description,
      }),
      ...(validated.status && { status: validated.status }),
      ...(validated.tags && { tags: validated.tags }),
      ...(validated.type && { type: validated.type as InitiativeType }),
      ...(validated.isPublic !== undefined && { isPublic: validated.isPublic }),
      ...(validated.collaboratorEmails !== undefined && {
        collaboratorEmails: validated.collaboratorEmails,
      }),
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
  await requireAuth();

  // Only owner can delete
  const isOwner = await isInitiativeOwner(id);
  if (!isOwner) {
    throw new Error("Only the owner can delete an initiative");
  }

  const existing = await prisma.initiative.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Initiative not found");
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
  await requireAuth();

  const templates = await prisma.initiativeTemplate.findMany({
    where: {
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return templates;
}

/**
 * Get driver definitions for a template or all available
 */
export async function getDriverDefinitions(templateId?: string) {
  await requireAuth();

  let driverKeys: string[] | undefined;

  if (templateId) {
    const template = await prisma.initiativeTemplate.findUnique({
      where: { id: templateId },
    });

    if (template) {
      driverKeys = [...template.requiredDrivers, ...template.optionalDrivers];
    }
  }

  const drivers = await prisma.driverDefinition.findMany({
    where: {
      isActive: true,
      ...(driverKeys && { key: { in: driverKeys } }),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return drivers;
}
