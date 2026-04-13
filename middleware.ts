import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/api/health(.*)"]);

const hasClerkKeys =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0 &&
  typeof process.env.CLERK_SECRET_KEY === "string" &&
  process.env.CLERK_SECRET_KEY.length > 0;

const clerk = clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth.protect();
});

export default function middleware(req: Request) {
  if (!hasClerkKeys) return NextResponse.next();
  // Delegate to Clerk middleware when configured.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (clerk as any)(req);
}

export const config = {
  matcher: [
    // Protect all routes except for static files and Next internals.
    "/((?!_next|.*\\.(?:css|js|json|jpg|jpeg|png|gif|svg|ico|webp|map|txt|xml)$).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};

