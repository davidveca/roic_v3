import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/input", // Public input request pages
];

// API routes that don't require authentication
const publicApiRoutes = [
  "/api/auth",
  "/api/input", // Public input submission
];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  const isPublicApiRoute = publicApiRoutes.some(
    (route) => nextUrl.pathname.startsWith(route)
  );

  // Allow public routes
  if (isPublicRoute || isPublicApiRoute) {
    // Redirect authenticated users away from login/register
    if (isAuthenticated && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
      return NextResponse.redirect(new URL("/initiatives", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has an organization
  if (!req.auth?.user?.orgId && !nextUrl.pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
