'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PersonalityResult } from './hmm';
import { Experience, Village, Host, VILLAGES, EXPERIENCES, HOSTS } from './data';

export type Booking = {
  id: string;
  experienceId: string;
  villageName: string;
  experienceName: string;
  hostName?: string;
  amount: number;
  split: { host: number; community: number; culture: number; platform: number };
  timestamp: number;
  cwsDelta: number;
}

export type SeedStatus = 'idle' | 'loading' | 'done' | 'error';

export type AppState = {
  observations: number[];
  personality: PersonalityResult | null;
  matches: (Experience & { score: number })[];
  bookings: Booking[];
  userId: string;
  points: number;
  badges: string[];
  totalImpact: number;
  villagesVisited: string[];
  destination: string;
  seedStatus: SeedStatus;
}

type AppContextType = AppState & {
  setObservations: (obs: number[]) => void;
  setPersonality: (p: PersonalityResult | null) => void;
  setMatches: (m: (Experience & { score: number })[]) => void;
  addBooking: (b: Booking) => void;
  addPoints: (p: number) => void;
  addBadge: (b: string) => void;
  resetOnboarding: () => void;
  seedLocation: (location: string) => Promise<void>;
};

const defaultState: AppState = {
  observations: [],
  personality: null,
  matches: [],
  bookings: [],
  userId: '',
  points: 0,
  badges: [],
  totalImpact: 0,
  villagesVisited: [],
  destination: '',
  seedStatus: 'idle',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wandergraph_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Never restore a loading state — it means the previous session crashed mid-request
        if (parsed.seedStatus === 'loading' || parsed.seedStatus === 'error') parsed.seedStatus = 'idle';
        setState(parsed);
        // Re-patch data arrays if a destination was previously seeded
        if (parsed.destination && parsed.seedStatus === 'done') {
          // Re-fetch seed data silently to repopulate arrays after page refresh
          fetch(`/api/seed?location=${encodeURIComponent(parsed.destination)}`)
            .then(r => r.json())
            .then(data => patchDataArrays(data))
            .catch(() => {});
        }
      } catch (e) {
        console.error('Failed to parse state', e);
      }
    } else {
      setState(prev => ({ ...prev, userId: 'user_' + Math.random().toString(36).slice(2, 8) }));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wandergraph_state', JSON.stringify(state));
    }
  }, [state, isLoaded]);

  function patchDataArrays(data: { villages?: Village[]; experiences?: Experience[]; hosts?: Host[] }) {
    if (data.villages?.length) {
      VILLAGES.splice(0, VILLAGES.length, ...data.villages);
    }
    if (data.experiences?.length) {
      // Normalise field names from Gemini response to frontend shape
      const exps = data.experiences.map((e: Record<string, unknown>) => ({
        id: e.id,
        villageId: e.village_id ?? e.villageId,
        name: (e.title ?? e.name) as string,
        type: e.type as Experience['type'],
        price: (e.price_eur ?? e.price ?? 0) as number,
        duration: e.duration_h ? `${e.duration_h}h` : (e.duration ?? ''),
        hostId: (e.host_id ?? e.hostId ?? '') as string,
        description: (e.description ?? '') as string,
        personalityWeights: (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as [number, number, number, number, number],
      })) as Experience[];
      EXPERIENCES.splice(0, EXPERIENCES.length, ...exps);
    }
    if (data.hosts?.length) {
      const hosts = data.hosts.map((h: Record<string, unknown>) => ({
        id: h.id,
        villageId: (h.village_id ?? h.villageId) as string,
        name: h.name as string,
        bio: (h.bio ?? '') as string,
        rating: (h.rating ?? 4.5) as number,
        experienceIds: (h.experienceIds ?? h.experience_ids ?? []) as string[],
      })) as Host[];
      HOSTS.splice(0, HOSTS.length, ...hosts);
    }
  }

  const setObservations = (obs: number[]) => setState(prev => ({ ...prev, observations: obs }));
  const setPersonality = (p: PersonalityResult | null) => setState(prev => ({ ...prev, personality: p }));
  const setMatches = (m: (Experience & { score: number })[]) => setState(prev => ({ ...prev, matches: m }));
  const addBooking = (b: Booking) => setState(prev => {
    const newBookings = [b, ...prev.bookings];
    const newImpact = prev.totalImpact + b.amount;
    const newVillages = Array.from(new Set([...prev.villagesVisited, b.villageName]));
    return { ...prev, bookings: newBookings, totalImpact: newImpact, villagesVisited: newVillages };
  });
  const addPoints = (p: number) => setState(prev => ({ ...prev, points: prev.points + p }));
  const addBadge = (b: string) => setState(prev => ({ ...prev, badges: Array.from(new Set([...prev.badges, b])) }));
  const resetOnboarding = () => setState(prev => ({ ...prev, observations: [], personality: null, matches: [] }));

  const seedLocation = async (location: string) => {
    setState(prev => ({ ...prev, destination: location, seedStatus: 'loading' }));
    try {
      const res = await fetch(`/api/seed?location=${encodeURIComponent(location)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data?.error === 'string' ? data.error : `Seed failed: ${res.status}`;
        console.error('Seed error:', message);
        setState(prev => ({ ...prev, seedStatus: 'idle' }));
        return;
      }
      patchDataArrays(data);
      setState(prev => ({
        ...prev,
        seedStatus: 'done',
        // Only reset booking/impact data, not personality — user may be mid-onboarding
        bookings: [],
        points: 0,
        badges: [],
        totalImpact: 0,
        villagesVisited: [],
      }));
    } catch (err) {
      console.error('Seed error:', err);
      // Don't persist error state — reset to idle so user can try again
      setState(prev => ({ ...prev, seedStatus: 'idle' }));
    }
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      ...state, setObservations, setPersonality, setMatches,
      addBooking, addPoints, addBadge, resetOnboarding, seedLocation,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
