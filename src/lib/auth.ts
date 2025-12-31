import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./db";

// Simplified user type for session (no org roles)
export interface ExtendedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

// Domain restriction for allowed organizations
const ALLOWED_DOMAINS = [
  "@wahlclipper.com",
  "@tedinitiatives.com",
  "@wayfinderco.com",
  "@capstonepartners.com",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
    error: "/login",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.NEXTAUTH_EMAIL_FROM || "ROIC Modeler <noreply@wahlclipper.com>",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Domain restriction: only allowed domains
      const email = user.email?.toLowerCase();
      if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }

      // Handle session updates (e.g., after profile edit)
      if (trigger === "update" && session) {
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.image !== undefined) {
          token.image = session.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as unknown as ExtendedUser).id = token.id as string;
        (session.user as unknown as ExtendedUser).email = token.email as string;
        (session.user as unknown as ExtendedUser).name = token.name as string | null;
        (session.user as unknown as ExtendedUser).image = token.picture as string | null;
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
        await prisma.auditEvent.create({
          data: {
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
    },
  },
  debug: process.env.NODE_ENV === "development",
});
