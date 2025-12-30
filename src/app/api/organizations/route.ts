import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const validated = createOrgSchema.parse(body);

    // Generate unique slug
    let slug = generateSlug(validated.name);
    let slugSuffix = 0;

    while (await prisma.organization.findUnique({ where: { slug } })) {
      slugSuffix++;
      slug = `${generateSlug(validated.name)}-${slugSuffix}`;
    }

    // Create organization and update user in transaction
    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: validated.name,
          slug,
          settings: {
            taxRate: 0.25,
            discountRate: 0.10,
            modelingPeriods: 5,
          },
        },
      });

      // Update user to belong to this org as admin
      await tx.user.update({
        where: { id: userId },
        data: {
          orgId: newOrg.id,
          orgRole: "ADMIN",
        },
      });

      return newOrg;
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Organization creation error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the organization" },
      { status: 500 }
    );
  }
}
