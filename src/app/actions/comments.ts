"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent, canAccessInitiative } from "@/lib/auth-utils";
import { z } from "zod";

const createCommentSchema = z.object({
  versionId: z.string(),
  content: z.string().min(1, "Comment cannot be empty"),
  driverKey: z.string().optional(),
  parentId: z.string().optional(),
});

export async function createComment(input: z.infer<typeof createCommentSchema>) {
  const user = await requireAuth();

  const validated = createCommentSchema.parse(input);

  // Get version to check access
  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: validated.versionId,
    },
    include: { initiative: true },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // Check access
  const hasAccess = await canAccessInitiative(version.initiativeId);
  if (!hasAccess) {
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

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
    },
    include: {
      version: { include: { initiative: true } },
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Check access
  const hasAccess = await canAccessInitiative(comment.version.initiativeId);
  if (!hasAccess) {
    throw new Error("Comment not found");
  }

  // Only author can delete their comments
  if (comment.authorId !== user.id) {
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
