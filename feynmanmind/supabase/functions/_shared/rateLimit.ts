import { HttpError } from './http.ts';

/**
 * Best-effort, in-memory rate limit per client IP.
 *
 * The functions are public (the app has no accounts), so this only slows down
 * casual abuse: counters live in one isolate and reset on cold starts. Put a
 * real limit in front for production (Supabase network restrictions, an API
 * gateway, or CAPTCHA), and cap spend in the AI provider's dashboard.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return function check(key: string): void {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
    if (recent.length >= limit) {
      throw new HttpError(429, 'Too many requests, try again later', 'rate_limited');
    }
    recent.push(t);
    hits.set(key, recent);
    // Keep memory bounded if many different IPs show up.
    if (hits.size > 10_000) hits.delete(hits.keys().next().value!);
  };
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}
