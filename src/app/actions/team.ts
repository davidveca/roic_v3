"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

/**
 * Get all users in the system (single-tenant mode)
 */
export async function getTeamMembers() {
  await requireAuth();

  const members = await prisma.user.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      image: true,
    },
  });

  return members;
}
