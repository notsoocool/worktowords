import crypto from "node:crypto";

export type RequestContext = {
  requestId: string;
  route: string;
  userId?: string | null;
  ip?: string;
};

export function requestIdFrom(req: Request) {
  const existing = req.headers.get("x-request-id");
  return existing && existing.trim().length > 0
    ? existing.trim()
    : crypto.randomUUID();
}

export function clientIpFrom(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function logSecurityInfo(
  event: string,
  ctx: RequestContext,
  details?: Record<string, unknown>
) {
  console.info(
    JSON.stringify({
      level: "info",
      event,
      ...ctx,
      ...(details ?? {}),
    })
  );
}

export function logSecurityWarn(
  event: string,
  ctx: RequestContext,
  details?: Record<string, unknown>
) {
  console.warn(
    JSON.stringify({
      level: "warn",
      event,
      ...ctx,
      ...(details ?? {}),
    })
  );
}
