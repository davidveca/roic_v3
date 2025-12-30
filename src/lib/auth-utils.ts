import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import type { OrgRole, InitiativeRole } from "@prisma/client";

/**
 * Get the current authenticated user session
 * Cached per request to avoid multiple auth calls
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require a specific org role or higher
 */
export async function requireOrgRole(requiredRole: OrgRole) {
  const user = await requireAuth();

  const roleHierarchy: Record<OrgRole, number> = {
    ADMIN: 5,
    FINANCE: 4,
    EDITOR: 3,
    CONTRIBUTOR: 2,
    VIEWER: 1,
  };

  if (roleHierarchy[user.orgRole] < roleHierarchy[requiredRole]) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Check if user can edit (Editor or higher)
 */
export async function canEdit() {
  const user = await getCurrentUser();
  if (!user) return false;
  return ["ADMIN", "FINANCE", "EDITOR"].includes(user.orgRole);
}

/**
 * Check if user can approve/review (Finance or Admin)
 */
export async function canApprove() {
  const user = await getCurrentUser();
  if (!user) return false;
  return ["ADMIN", "FINANCE"].includes(user.orgRole);
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.orgRole === "ADMIN";
}

/**
 * Get user's role for a specific initiative
 */
export async function getInitiativeRole(initiativeId: string): Promise<InitiativeRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // First check initiative ownership
  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: { ownerId: true, orgId: true },
  });

  if (!initiative) return null;

  // Verify user is in the same org
  if (initiative.orgId !== user.orgId) return null;

  // Owner always has OWNER role
  if (initiative.ownerId === user.id) return "OWNER";

  // Check explicit role assignment
  const userRole = await prisma.initiativeUserRole.findUnique({
    where: {
      initiativeId_userId: {
        initiativeId,
        userId: user.id,
      },
    },
  });

  if (userRole) return userRole.role;

  // Fall back to org role mapping
  const orgRoleToInitiativeRole: Partial<Record<OrgRole, InitiativeRole>> = {
    ADMIN: "OWNER",
    FINANCE: "REVIEWER",
    EDITOR: "CONTRIBUTOR",
    CONTRIBUTOR: "CONTRIBUTOR",
    VIEWER: "VIEWER",
  };

  return orgRoleToInitiativeRole[user.orgRole] ?? "VIEWER";
}

/**
 * Check if user can perform an action on an initiative
 */
export async function canPerformInitiativeAction(
  initiativeId: string,
  action: "view" | "edit" | "approve" | "delete"
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const role = await getInitiativeRole(initiativeId);
  if (!role) return false;

  const actionPermissions: Record<typeof action, InitiativeRole[]> = {
    view: ["VIEWER", "CONTRIBUTOR", "REVIEWER", "OWNER"],
    edit: ["CONTRIBUTOR", "OWNER"],
    approve: ["REVIEWER", "OWNER"],
    delete: ["OWNER"],
  };

  // Admins can do everything
  if (user.orgRole === "ADMIN") return true;

  return actionPermissions[action].includes(role);
}

/**
 * Verify user has access to an organization
 */
export async function verifyOrgAccess(orgId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.orgId === orgId;
}

/**
 * Create an audit event
 */
export async function createAuditEvent(params: {
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return;

  await prisma.auditEvent.create({
    data: {
      orgId: user.orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      oldValue: params.oldValue as never,
      newValue: params.newValue as never,
      metadata: params.metadata as never,
    },
  });
}
