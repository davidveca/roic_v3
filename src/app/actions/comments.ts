"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import { z } from "zod";

const createCommentSchema = z.object({
  versionId: z.string(),
  content: z.string().min(1, "Comment cannot be empty"),
  driverKey: z.string().optional(),
  parentId: z.string().optional(),
});

export async function createComment(input: z.infer<typeof createCommentSchema>) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const validated = createCommentSchema.parse(input);

  // Verify version belongs to user's org
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

  const comment = await prisma.comment.create({
    data: {
      versionId: validated.versionId,
      authorId: user.id,
      content: validated.content,
      driverKey: validated.driverKey,
      parentId: validated.parentId,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditEvent({
    action: "COMMENT_CREATED",
    resourceType: "Comment",
    resourceId: comment.id,
    newValue: { content: validated.content.substring(0, 100) },
  });

  revalidatePath(`/initiatives/${version.initiativeId}`);

  return comment;
}

export async function deleteComment(commentId: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      version: {
        initiative: { orgId: user.orgId },
      },
    },
    include: {
      version: { include: { initiative: true } },
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Only author or admin can delete
  if (comment.authorId !== user.id && user.orgRole !== "ADMIN") {
    throw new Error("You can only delete your own comments");
  }

  await prisma.comment.delete({ where: { id: commentId } });

  await createAuditEvent({
    action: "COMMENT_DELETED",
    resourceType: "Comment",
    resourceId: commentId,
  });

  revalidatePath(`/initiatives/${comment.version.initiativeId}`);

  return { success: true };
}
