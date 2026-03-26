'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PersonalityResult } from './hmm';
import { Experience } from './data';

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
}

type AppContextType = AppState & {
  setObservations: (obs: number[]) => void;
  setPersonality: (p: PersonalityResult | null) => void;
  setMatches: (m: (Experience & { score: number })[]) => void;
  addBooking: (b: Booking) => void;
  addPoints: (p: number) => void;
  addBadge: (b: string) => void;
  resetOnboarding: () => void;
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wandergraph_state');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setState(JSON.parse(saved));
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

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <AppContext.Provider value={{
      ...state, setObservations, setPersonality, setMatches, addBooking, addPoints, addBadge, resetOnboarding
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
