'use client';

import { useEffect } from 'react';
import { VILLAGES, EXPERIENCES, Village, Experience } from './data';

// Fetch live data from the API routes (which proxy to C++) and patch the
// shared mutable arrays so every component using getVillage()/getExperience()
// automatically works with real data, with the static arrays as fallback.

/** Number of experiences fetched per parallel request. */
const EXPERIENCES_PAGE_SIZE = 100;

export function DataProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function loadVillages() {
      try {
        const res = await fetch('/api/villages');
        if (!res.ok) return;
        const data: Village[] = await res.json();
        if (data.length === 0) return;
        VILLAGES.splice(0, VILLAGES.length, ...data);
      } catch {
        // Keep static fallback
      }
    }

    async function loadExperiences() {
      try {
        // Fetch the first page; the X-Total-Count header tells us the full size.
        const firstRes = await fetch(`/api/experiences?limit=${EXPERIENCES_PAGE_SIZE}&offset=0`);
        if (!firstRes.ok) return;

        const total = parseInt(firstRes.headers.get('X-Total-Count') ?? '0', 10);
        const firstPage: Experience[] = await firstRes.json();
        if (firstPage.length === 0) return;

        // Splice the first page in immediately so the UI can start rendering.
        EXPERIENCES.splice(0, EXPERIENCES.length, ...firstPage);

        // If there are more pages, fetch all remaining pages in parallel.
        if (total > EXPERIENCES_PAGE_SIZE) {
          const pageCount = Math.ceil(total / EXPERIENCES_PAGE_SIZE);
          const remainingFetches = Array.from({ length: pageCount - 1 }, async (_, i) => {
            const offset = (i + 1) * EXPERIENCES_PAGE_SIZE;
            const r = await fetch(`/api/experiences?limit=${EXPERIENCES_PAGE_SIZE}&offset=${offset}`);
            return r.ok ? (r.json() as Promise<Experience[]>) : ([] as Experience[]);
          });

          const remainingPages = await Promise.all(remainingFetches);
          const allExtra = remainingPages.flat();
          if (allExtra.length > 0) {
            // Merge without duplicating IDs from the first page.
            const seen = new Set(EXPERIENCES.map(e => e.id));
            const deduped = allExtra.filter(e => !seen.has(e.id));
            EXPERIENCES.push(...deduped);
          }
        }
      } catch {
        // Keep static fallback
      }
    }

    loadVillages();
    loadExperiences();
  }, []);

  return <>{children}</>;
}
