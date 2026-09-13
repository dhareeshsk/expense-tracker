// In-memory sliding-window rate limiter. Good enough for a single warm
// serverless instance; resets on cold start. Swap for @upstash/ratelimit +
// Upstash Redis if durable, cross-instance limits are needed at higher scale.
const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (existing.length >= limit) {
    const retryAfterMs = existing[0] + windowMs - now;
    hits.set(key, existing);
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  existing.push(now);
  hits.set(key, existing);
  return { ok: true, retryAfterMs: 0 };
}

export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
