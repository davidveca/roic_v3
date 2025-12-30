import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { OrgRole } from "@prisma/client";

// Extended user type for session
export interface ExtendedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  orgId: string | null;
  orgRole: OrgRole;
  orgName?: string;
  orgSlug?: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            org: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          orgId: user.orgId,
          orgRole: user.orgRole,
        } as never;
      },
    }),
    // Add more providers here (Google, GitHub, OIDC, SAML, etc.)
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        const u = user as unknown as ExtendedUser;
        token.id = u.id;
        token.email = u.email;
        token.name = u.name;
        token.image = u.image;
        token.orgId = u.orgId;
        token.orgRole = u.orgRole;

        // Fetch org details
        if (u.orgId) {
          const org = await prisma.organization.findUnique({
            where: { id: u.orgId },
            select: { name: true, slug: true },
          });
          if (org) {
            token.orgName = org.name;
            token.orgSlug = org.slug;
          }
        }
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as ExtendedUser) = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          image: token.picture as string | null,
          orgId: token.orgId as string | null,
          orgRole: token.orgRole as OrgRole,
          orgName: token.orgName as string | undefined,
          orgSlug: token.orgSlug as string | undefined,
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      // Log sign in event for audit trail
      if (user.id && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { orgId: true },
        });

        if (dbUser?.orgId) {
          await prisma.auditEvent.create({
            data: {
              orgId: dbUser.orgId,
              actorId: user.id,
              actorEmail: user.email,
              action: isNewUser ? "USER_REGISTERED" : "USER_SIGNED_IN",
              resourceType: "User",
              resourceId: user.id,
              metadata: {
                isNewUser,
                timestamp: new Date().toISOString(),
              },
            },
          });
        }
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
});
