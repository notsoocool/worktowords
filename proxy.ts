import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/api/health(.*)"]);

const hasClerkKeys =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0 &&
  typeof process.env.CLERK_SECRET_KEY === "string" &&
  process.env.CLERK_SECRET_KEY.length > 0;

const clerk = clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth.protect();
});

function contentSecurityPolicy() {
  const isProd = process.env.NODE_ENV === "production";
  const connectDev =
    isProd
      ? ""
      : " ws://localhost:* http://localhost:*";

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.clerk.com https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.openai.com https://*.supabase.co https://api.razorpay.com https://*.clerk.com https://*.clerk.accounts.dev${connectDev}`,
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.clerk.com https://*.clerk.accounts.dev",
    "worker-src 'self' blob:",
  ];

  // Only force HTTPS upgrades in production; this breaks localhost over http.
  if (isProd) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

function withSecurityHeaders(req: NextRequest, res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isProd) {
    res.headers.set("Content-Security-Policy", contentSecurityPolicy());
  } else {
    // Avoid CSP interference during local development/HMR.
    res.headers.delete("Content-Security-Policy");
  }
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");

  if (isProd && req.nextUrl.protocol === "https:") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return res;
}

export default async function proxy(req: NextRequest) {
  if (!hasClerkKeys) return withSecurityHeaders(req, NextResponse.next());

  // Delegate auth protection to Clerk proxy when configured.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (clerk as any)(req);
  return withSecurityHeaders(req, res ?? NextResponse.next());
}

export const config = {
  matcher: [
    // Protect all routes except for static files and Next internals.
    "/((?!_next|.*\\.(?:css|js|json|jpg|jpeg|png|gif|svg|ico|webp|map|txt|xml)$).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
