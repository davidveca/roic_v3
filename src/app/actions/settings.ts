"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import { z } from "zod";

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  hurdleRate: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  boardReviewThreshold: z.number().min(0).optional(),
  lightTouchThreshold: z.number().min(0).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Get application settings (singleton)
 */
export async function getAppSettings() {
  await requireAuth();

  // Get or create settings singleton
  let settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: "singleton" },
    });
  }

  // Get initiative count
  const initiativeCount = await prisma.initiative.count();

  return {
    ...settings,
    _count: {
      initiatives: initiativeCount,
    },
  };
}

/**
 * Update application settings
 */
export async function updateAppSettings(input: UpdateSettingsInput) {
  await requireAuth();

  const validated = updateSettingsSchema.parse(input);

  // Get current settings
  const current = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!current) {
    throw new Error("Settings not found");
  }

  const updated = await prisma.settings.update({
    where: { id: "singleton" },
    data: {
      ...(validated.companyName !== undefined && { companyName: validated.companyName }),
      ...(validated.hurdleRate !== undefined && { hurdleRate: validated.hurdleRate }),
      ...(validated.taxRate !== undefined && { taxRate: validated.taxRate }),
      ...(validated.currency !== undefined && { currency: validated.currency }),
      ...(validated.fiscalYearStart !== undefined && { fiscalYearStart: validated.fiscalYearStart }),
      ...(validated.boardReviewThreshold !== undefined && {
        boardReviewThreshold: validated.boardReviewThreshold,
      }),
      ...(validated.lightTouchThreshold !== undefined && {
        lightTouchThreshold: validated.lightTouchThreshold,
      }),
    },
  });

  await createAuditEvent({
    action: "SETTINGS_UPDATED",
    resourceType: "Settings",
    resourceId: "singleton",
    oldValue: current,
    newValue: updated,
  });

  revalidatePath("/settings");
  revalidatePath("/initiatives");

  return updated;
}
