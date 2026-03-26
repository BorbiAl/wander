'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PersonalityResult } from './hmm';
import { Experience, Village, Host, FriendProfile, VILLAGES, EXPERIENCES, HOSTS } from './data';

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

// StoredGroup is the server-side shape (members with full profiles, not just IDs)
export type StoredMember = {
  userId: string;
  displayName: string;
  vector: [number, number, number, number, number];
  dominant: string;
  joinedAt: number;
};

export type StoredGroup = {
  id: string;
  name: string;
  members: StoredMember[];
  destination: string;
  createdAt: number;
};

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
  friends: FriendProfile[];
  activeGroupId: string | null;
  // Auth
  email: string | null;
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
  addFriend: (f: FriendProfile) => void;
  removeFriend: (userId: string) => void;
  // Group actions — all hit the backend API
  createGroup: (name: string, destination: string) => Promise<StoredGroup | null>;
  joinGroup: (groupId: string) => Promise<StoredGroup | null>;
  setActiveGroup: (groupId: string | null) => void;
  // Auth actions
  loginWithEmail: (email: string, userId: string, savedState: Record<string, unknown> | null) => void;
  logout: () => void;
  saveToAccount: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
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
  friends: [],
  activeGroupId: null,
  email: null,
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
        // Merge with defaultState so any new fields added to the schema get their defaults
        // Drop old local-only `groups` field if present (now backend-managed)
        const { groups: _groups, ...rest } = parsed;
        void _groups; // intentionally unused
        setState({ ...defaultState, ...rest });
        // Re-patch data arrays if a destination was previously seeded
        if (parsed.destination && parsed.seedStatus === 'done') {
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

  // Build a StoredMember from current user state (requires personality to be set)
  function selfAsMember(currentState: AppState): StoredMember | null {
    if (!currentState.personality) return null;
    return {
      userId: currentState.userId,
      displayName: `Traveler #${currentState.userId.slice(-4)}`,
      vector: currentState.personality.vector,
      dominant: currentState.personality.dominant,
      joinedAt: Date.now(),
    };
  }

  const setObservations = (obs: number[]) => setState(prev => ({ ...prev, observations: [...prev.observations, ...obs] }));
  const setPersonality = (p: PersonalityResult | null) => setState(prev => {
    if (!p || !prev.personality) return { ...prev, personality: p };
    // Weighted average: weight old vector by prior observation count, new by latest batch (15)
    const oldWeight = prev.observations.length;
    const newWeight = 15;
    const total = oldWeight + newWeight;
    const blended = prev.personality.vector.map(
      (v, i) => (v * oldWeight + p.vector[i] * newWeight) / total
    ) as [number, number, number, number, number];
    const dominantIndex = blended.indexOf(Math.max(...blended));
    return {
      ...prev,
      personality: {
        vector: blended,
        dominantIndex,
        dominant: ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian'][dominantIndex],
      },
    };
  });
  const setMatches = (m: (Experience & { score: number })[]) => setState(prev => ({ ...prev, matches: m }));
  const addBooking = (b: Booking) => setState(prev => {
    const newBookings = [b, ...prev.bookings];
    const newImpact = prev.totalImpact + b.amount;
    const newVillages = Array.from(new Set([...prev.villagesVisited, b.villageName]));
    return { ...prev, bookings: newBookings, totalImpact: newImpact, villagesVisited: newVillages };
  });
  const addPoints = (p: number) => setState(prev => ({ ...prev, points: prev.points + p }));
  const addBadge = (b: string) => setState(prev => ({ ...prev, badges: Array.from(new Set([...prev.badges, b])) }));
  const resetOnboarding = () => setState(prev => ({ ...prev, observations: [], personality: null, matches: [] })); // full reset (clears history)

  const addFriend = (f: FriendProfile) => setState(prev => {
    const filtered = prev.friends.filter(fr => fr.userId !== f.userId);
    return { ...prev, friends: [...filtered, f] };
  });
  const removeFriend = (userId: string) => setState(prev => ({
    ...prev,
    friends: prev.friends.filter(f => f.userId !== userId),
  }));

  // createGroup: hits POST /api/groups, returns the created group
  const createGroup = async (name: string, destination: string): Promise<StoredGroup | null> => {
    const member = selfAsMember(state);
    if (!member) return null;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, destination, creator: member }),
      });
      if (!res.ok) return null;
      const group: StoredGroup = await res.json();
      setState(prev => ({ ...prev, activeGroupId: group.id }));
      return group;
    } catch {
      return null;
    }
  };

  // joinGroup: hits PATCH /api/groups/[id] to add self as member
  const joinGroup = async (groupId: string): Promise<StoredGroup | null> => {
    const member = selfAsMember(state);
    if (!member) return null;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member }),
      });
      if (!res.ok) return null;
      const group: StoredGroup = await res.json();
      setState(prev => ({ ...prev, activeGroupId: group.id }));
      return group;
    } catch {
      return null;
    }
  };

  const setActiveGroup = (groupId: string | null) => setState(prev => ({ ...prev, activeGroupId: groupId }));

  // Auth: restore saved server state on login
  const loginWithEmail = (email: string, userId: string, savedState: Record<string, unknown> | null) => {
    if (savedState) {
      const { groups: _groups, ...rest } = savedState as Record<string, unknown> & { groups?: unknown };
      void _groups;
      if ((rest.seedStatus as string) === 'loading' || (rest.seedStatus as string) === 'error') rest.seedStatus = 'idle';
      const merged = { ...defaultState, ...(rest as Partial<AppState>), email, userId };
      setState(merged);
      localStorage.setItem('wandergraph_state', JSON.stringify(merged));
      if (merged.destination && merged.seedStatus === 'done') {
        fetch(`/api/seed?location=${encodeURIComponent(merged.destination)}`)
          .then(r => r.json())
          .then(data => patchDataArrays(data))
          .catch(() => {});
      }
    } else {
      // New account — keep current local state but stamp it with the account
      setState(prev => {
        const next = { ...prev, email, userId };
        localStorage.setItem('wandergraph_state', JSON.stringify(next));
        return next;
      });
    }
  };

  const logout = () => {
    const fresh = { ...defaultState, userId: 'user_' + Math.random().toString(36).slice(2, 8) };
    setState(fresh);
    localStorage.setItem('wandergraph_state', JSON.stringify(fresh));
  };

  const saveToAccount = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Strip transient/non-serialisable fields before saving
      const { seedStatus: _s, ...stateToSave } = state;
      void _s;
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', email, password, state: stateToSave }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: (data.error as string) ?? 'Failed to save' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  };

  async function parseResponseBody(res: Response): Promise<Record<string, unknown>> {
    // Some responses are empty or return HTML/text on server errors; parse defensively.
    if (res.status === 204 || res.status === 205) return {};

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('application/json')) {
      return (await res.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const text = await res.text().catch(() => '');
    if (!text) return {};

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { message: text };
    }
  }

  const seedLocation = async (location: string) => {
    setState(prev => ({ ...prev, destination: location, seedStatus: 'loading' }));
    try {
      const res = await fetch(`/api/seed?location=${encodeURIComponent(location)}`);
      const data = await parseResponseBody(res);
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
        bookings: [],
        points: 0,
        badges: [],
        totalImpact: 0,
        villagesVisited: [],
      }));
    } catch (err) {
      console.error('Seed error:', err);
      setState(prev => ({ ...prev, seedStatus: 'idle' }));
    }
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      ...state, setObservations, setPersonality, setMatches,
      addBooking, addPoints, addBadge, resetOnboarding, seedLocation,
      addFriend, removeFriend, createGroup, joinGroup, setActiveGroup,
      loginWithEmail, logout, saveToAccount,
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
