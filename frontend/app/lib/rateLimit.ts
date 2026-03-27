/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Suitable for single-process servers (standard Next.js dev/standalone).
 * For multi-instance deployments, replace the Map with a Redis backend.
 *
 * Usage:
 *   import { checkRateLimit } from '@/app/lib/rateLimit';
 *
 *   // Allow 5 attempts per email per 10 minutes
 *   if (!checkRateLimit(`otp:${email}`, 5, 10 * 60 * 1000)) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 */

type Bucket = {
  count: number;
  resetsAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Returns `true` if the request is within the allowed rate, `false` if
 * the limit has been exceeded. Automatically resets after `windowMs`.
 *
 * @param key      Unique identifier (e.g. `"otp:user@example.com"`)
 * @param limit    Maximum number of requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetsAt) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
