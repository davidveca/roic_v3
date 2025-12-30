"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import { z } from "zod";
import { OrgRole } from "@prisma/client";

const updateMemberRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "FINANCE", "EDITOR", "CONTRIBUTOR", "VIEWER"]),
});

const removeMemberSchema = z.object({
  userId: z.string(),
});

export async function getTeamMembers() {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const members = await prisma.user.findMany({
    where: { orgId: user.orgId },
    orderBy: [{ orgRole: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      orgRole: true,
      createdAt: true,
      image: true,
    },
  });

  return members;
}

export async function updateMemberRole(input: z.infer<typeof updateMemberRoleSchema>) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  // Only admin can change roles
  if (user.orgRole !== "ADMIN") {
    throw new Error("Only administrators can change member roles");
  }

  const validated = updateMemberRoleSchema.parse(input);

  // Cannot change your own role
  if (validated.userId === user.id) {
    throw new Error("You cannot change your own role");
  }

  // Verify member belongs to same org
  const member = await prisma.user.findFirst({
    where: {
      id: validated.userId,
      orgId: user.orgId,
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const updated = await prisma.user.update({
    where: { id: validated.userId },
    data: { orgRole: validated.role as OrgRole },
  });

  await createAuditEvent({
    action: "MEMBER_ROLE_CHANGED",
    resourceType: "User",
    resourceId: validated.userId,
    oldValue: { role: member.orgRole },
    newValue: { role: validated.role },
  });

  revalidatePath("/team");

  return updated;
}

export async function removeMember(input: z.infer<typeof removeMemberSchema>) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  // Only admin can remove members
  if (user.orgRole !== "ADMIN") {
    throw new Error("Only administrators can remove members");
  }

  const validated = removeMemberSchema.parse(input);

  // Cannot remove yourself
  if (validated.userId === user.id) {
    throw new Error("You cannot remove yourself from the organization");
  }

  // Verify member belongs to same org
  const member = await prisma.user.findFirst({
    where: {
      id: validated.userId,
      orgId: user.orgId,
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  // Remove user from org (don't delete the user)
  const updated = await prisma.user.update({
    where: { id: validated.userId },
    data: {
      orgId: null,
      orgRole: "VIEWER",
    },
  });

  await createAuditEvent({
    action: "MEMBER_REMOVED",
    resourceType: "User",
    resourceId: validated.userId,
    oldValue: { email: member.email, role: member.orgRole },
  });

  revalidatePath("/team");

  return { success: true };
}

export async function inviteMember(email: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  // Only admin can invite
  if (user.orgRole !== "ADMIN") {
    throw new Error("Only administrators can invite members");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.orgId === user.orgId) {
      throw new Error("This user is already a member of your organization");
    }
    if (existingUser.orgId) {
      throw new Error("This user already belongs to another organization");
    }

    // Add existing user to org
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        orgId: user.orgId,
        orgRole: "VIEWER",
      },
    });

    await createAuditEvent({
      action: "MEMBER_ADDED",
      resourceType: "User",
      resourceId: existingUser.id,
      newValue: { email, role: "VIEWER" },
    });

    revalidatePath("/team");

    return { success: true, message: "User added to organization" };
  }

  // For now, just return a message that user needs to register first
  // In a full implementation, you'd send an invite email
  return {
    success: false,
    message: "User not found. They need to register first, then you can add them.",
  };
}
