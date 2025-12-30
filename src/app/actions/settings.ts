"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateOrgSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  modelingPeriods: z.number().int().min(1).max(20).optional(),
});

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;

export async function updateOrgSettings(input: UpdateOrgSettingsInput) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  // Only admin can update settings
  if (user.orgRole !== "ADMIN") {
    throw new Error("Only administrators can update organization settings");
  }

  const validated = updateOrgSettingsSchema.parse(input);

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { settings: true, name: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const currentSettings = (org.settings as Record<string, unknown>) || {};

  const updatedSettings = {
    ...currentSettings,
    ...(validated.taxRate !== undefined && { taxRate: validated.taxRate }),
    ...(validated.discountRate !== undefined && { discountRate: validated.discountRate }),
    ...(validated.modelingPeriods !== undefined && { modelingPeriods: validated.modelingPeriods }),
  };

  const updated = await prisma.organization.update({
    where: { id: user.orgId },
    data: {
      ...(validated.name && { name: validated.name }),
      settings: updatedSettings as Prisma.InputJsonValue,
    },
  });

  await createAuditEvent({
    action: "ORG_SETTINGS_UPDATED",
    resourceType: "Organization",
    resourceId: user.orgId,
    oldValue: { name: org.name, settings: org.settings },
    newValue: { name: validated.name || org.name, settings: updatedSettings },
  });

  revalidatePath("/settings");

  return updated;
}

export async function getOrgSettings() {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          initiatives: true,
        },
      },
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  return org;
}
