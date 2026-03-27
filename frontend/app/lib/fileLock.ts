/**
 * Simple async mutex for file I/O — prevents concurrent read-modify-write races
 * on the same JSON file when multiple requests arrive simultaneously.
 *
 * Usage:
 *   import { withFileLock } from '@/app/lib/fileLock';
 *   const result = await withFileLock('groups', async () => {
 *     const data = await readGroups();
 *     data.push(newItem);
 *     await writeGroups(data);
 *     return newItem;
 *   });
 *
 * Note: this mutex is per-process. It is not suitable for multi-instance
 * deployments. For those, use a distributed lock (e.g. Redis SETNX).
 */

const locks = new Map<string, Promise<void>>();

export async function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Chain onto any existing lock for this key so operations are serialised.
  const prior = locks.get(key) ?? Promise.resolve();

  let release!: () => void;
  const acquired = new Promise<void>((resolve) => { release = resolve; });

  // The next waiter will chain onto `acquired`, not `prior`.
  locks.set(key, acquired);

  // Wait for the previous holder to finish.
  await prior;

  try {
    return await fn();
  } finally {
    release();
    // Clean up the map entry once no other callers are waiting on `acquired`.
    // If another caller already replaced the entry, leave it alone.
    if (locks.get(key) === acquired) locks.delete(key);
  }
}
