/**
 * Server-side in-memory cache for parsed JSON file content.
 *
 * Eliminates repeated disk reads and JSON.parse() overhead across
 * concurrent requests within the TTL window. Lives in the Node.js module
 * cache so it persists for the lifetime of the server process.
 *
 * Usage:
 *   import { getCached, setCached } from '@/app/lib/fileCache';
 *
 *   let data = getCached<MyType[]>('experiences');
 *   if (!data) {
 *     data = JSON.parse(await readFile(path, 'utf-8')) as MyType[];
 *     setCached('experiences', data, 60_000); // cache 60 s
 *   }
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

// Module-level store — one Map instance shared across all requests.
const store = new Map<string, CacheEntry<unknown>>();

/** Returns the cached value, or `undefined` if missing / expired. */
export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/** Stores a value under `key` for `ttlMs` milliseconds. */
export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidates a cached entry immediately (e.g. after a write).
 * Safe to call even if the key doesn't exist.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}
