'use client';

import { useEffect } from 'react';
import { VILLAGES, EXPERIENCES, Village, Experience } from './data';

// Fetch live data from the API routes (which proxy to C++) and patch the
// shared mutable arrays so every component using getVillage()/getExperience()
// automatically works with real data, with the static arrays as fallback.

export function DataProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function loadVillages() {
      try {
        const res = await fetch('/api/villages');
        if (!res.ok) return;
        const data: Village[] = await res.json();
        if (data.length === 0) return;
        // Patch in-place: replace contents without changing the array reference
        VILLAGES.splice(0, VILLAGES.length, ...data);
      } catch {
        // Keep static fallback
      }
    }

    async function loadExperiences() {
      try {
        const res = await fetch('/api/experiences');
        if (!res.ok) return;
        const data: Experience[] = await res.json();
        if (data.length === 0) return;
        EXPERIENCES.splice(0, EXPERIENCES.length, ...data);
      } catch {
        // Keep static fallback
      }
    }

    loadVillages();
    loadExperiences();
  }, []);

  return <>{children}</>;
}
