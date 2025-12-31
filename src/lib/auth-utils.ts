import { auth, type ExtendedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";

/**
 * Get the current authenticated user session
 * Cached per request to avoid multiple auth calls
 */
export const getCurrentUser = cache(async (): Promise<ExtendedUser | null> => {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as ExtendedUser;
});

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<ExtendedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Check if user can access an initiative
 * Access is granted if: isPublic OR ownerEmail matches OR user is in collaboratorEmails
 */
export async function canAccessInitiative(
  initiativeId: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: {
      ownerEmail: true,
      collaboratorEmails: true,
      isPublic: true,
    },
  });

  if (!initiative) return false;

  // Public initiatives are accessible to all authenticated users
  if (initiative.isPublic) return true;

  // Owner has access
  if (initiative.ownerEmail.toLowerCase() === user.email.toLowerCase())
    return true;

  // Check collaborators
  if (initiative.collaboratorEmails) {
    const collaborators = initiative.collaboratorEmails
      .split(",")
      .map((e) => e.trim().toLowerCase());
    if (collaborators.includes(user.email.toLowerCase())) return true;
  }

  return false;
}

/**
 * Check if user can edit an initiative
 * Owner can always edit, collaborators can only edit if version is DRAFT
 */
export async function canEditInitiative(
  initiativeId: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: {
      ownerEmail: true,
      collaboratorEmails: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { state: true },
      },
    },
  });

  if (!initiative) return false;

  // Owner can always edit
  if (initiative.ownerEmail.toLowerCase() === user.email.toLowerCase())
    return true;

  // Collaborators can only edit DRAFT versions
  if (initiative.collaboratorEmails) {
    const collaborators = initiative.collaboratorEmails
      .split(",")
      .map((e) => e.trim().toLowerCase());
    if (collaborators.includes(user.email.toLowerCase())) {
      // Check if latest version is DRAFT
      return initiative.versions[0]?.state === "DRAFT";
    }
  }

  return false;
}

/**
 * Check if user is the owner of an initiative
 */
export async function isInitiativeOwner(
  initiativeId: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: { ownerEmail: true },
  });

  if (!initiative) return false;
  return initiative.ownerEmail.toLowerCase() === user.email.toLowerCase();
}

/**
 * Check if user is a collaborator on an initiative
 */
export async function isCollaborator(initiativeId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: { collaboratorEmails: true },
  });

  if (!initiative?.collaboratorEmails) return false;

  const collaborators = initiative.collaboratorEmails
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return collaborators.includes(user.email.toLowerCase());
}

/**
 * Require access to an initiative or redirect to unauthorized
 */
export async function requireInitiativeAccess(
  initiativeId: string
): Promise<ExtendedUser> {
  const user = await requireAuth();
  const hasAccess = await canAccessInitiative(initiativeId);
  if (!hasAccess) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Require edit permission on an initiative or redirect to unauthorized
 */
export async function requireInitiativeEdit(
  initiativeId: string
): Promise<ExtendedUser> {
  const user = await requireAuth();
  const canEdit = await canEditInitiative(initiativeId);
  if (!canEdit) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Get accessible initiatives query filter for the current user
 * Returns a Prisma where clause for filtering initiatives
 */
export async function getAccessibleInitiativesFilter() {
  const user = await getCurrentUser();
  if (!user) {
    return { id: "none" }; // Return impossible filter
  }

  return {
    OR: [
      { isPublic: true },
      { ownerEmail: { equals: user.email, mode: "insensitive" as const } },
      {
        collaboratorEmails: { contains: user.email, mode: "insensitive" as const },
      },
    ],
  };
}

/**
 * Get the settings singleton
 */
export async function getSettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  // Return defaults if settings don't exist yet
  return (
    settings ?? {
      id: "singleton",
      hurdleRate: 12,
      taxRate: 25,
      currency: "USD",
      companyName: "Wahl Clipper Corporation",
      fiscalYearStart: 1,
      boardReviewThreshold: 2000000,
      lightTouchThreshold: 50000,
      updatedAt: new Date(),
    }
  );
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
  if (!user) return;

  await prisma.auditEvent.create({
    data: {
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
