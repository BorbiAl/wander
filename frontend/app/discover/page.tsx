'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const VillageMap = dynamic(() => import('@/components/VillageMap'), { ssr: false });
import { useApp } from '@/app/lib/store';
import { StoredGroup } from '@/app/lib/store';
import { Experience, Village, EXPERIENCES, VILLAGES } from '@/app/lib/data';
import { cwsColor, cwsLabel } from '@/app/lib/utils';
import { matchScore, computeGroupVector } from '@/app/lib/hmm';

const FILTERS = ['All', 'craft', 'hike', 'homestay', 'ceremony', 'cooking', 'volunteer', 'folklore', 'sightseeing'] as const;

type ScoredExperience = Experience & { score: number };


export default function DiscoverPage() {
  const router = useRouter();
  const { personality, matches, setMatches, seedStatus, destination, activeGroupId, setActiveGroup, volunteerIntent } = useApp();
  const [filterType, setFilterType] = useState<string>(() => volunteerIntent ? 'volunteer' : 'All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(() => volunteerIntent);
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'cws'>('match');
  const [freeSightseeing, setFreeSightseeing] = useState<Experience[]>([]);
  const [activeVolunteering, setActiveVolunteering] = useState<Experience[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [villages, setVillages] = useState<Village[]>(VILLAGES);
  const [experiences, setExperiences] = useState<Experience[]>(EXPERIENCES);
  const [activeGroup, setActiveGroupData] = useState<StoredGroup | null>(null);

  useEffect(() => {
    // If user picked a destination but seeding did not succeed,
    // avoid showing unrelated global fallback content.
    if (destination && seedStatus !== 'done') {
      setVillages([]);
      setExperiences([]);
      return;
    }

    // If the store already seeded location-specific data, use those in-memory arrays directly.
    // The /api/villages route falls back to static Bulgarian data when the C++ backend is down,
    // which would overwrite the seeded data with the wrong country.
    if (seedStatus === 'done') {
      setVillages([...VILLAGES]);
      setExperiences([...EXPERIENCES]);
      return;
    }

    let mounted = true;

    async function loadLiveData() {
      try {
        const [vRes, eRes] = await Promise.all([
          fetch('/api/villages', { cache: 'no-store' }),
          fetch('/api/experiences', { cache: 'no-store' }),
        ]);
        if (!mounted) return;

        if (vRes.ok) {
          const data: Village[] = await vRes.json();
          if (data.length > 0) setVillages(data);
        }
        if (eRes.ok) {
          const data: Experience[] = await eRes.json();
          if (data.length > 0) setExperiences(data);
        }
      } catch {
        // Keep static fallback arrays when API is unavailable.
      }
    }

    loadLiveData();
    return () => {
      mounted = false;
    };
  }, [seedStatus, destination]);

  useEffect(() => {
    if (!personality) return;
    const scored = experiences
      .map(exp => ({
        ...exp,
        score: matchScore(personality.vector, exp.personalityWeights),
      }))
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0) setMatches(scored);
  }, [personality, experiences]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch free sightseeing and active volunteering sections
  useEffect(() => {
    async function loadSections() {
      try {
        const [sRes, vRes] = await Promise.all([
          fetch('/api/sightseeing', { cache: 'no-store' }),
          fetch('/api/volunteering?active_only=true', { cache: 'no-store' }),
        ]);
        if (sRes.ok) { const d = await sRes.json(); if (Array.isArray(d)) setFreeSightseeing(d); }
        if (vRes.ok) { const d = await vRes.json(); if (Array.isArray(d)) setActiveVolunteering(d); }
      } catch { /* keep empty */ }
    }
    loadSections();
  }, []);

  // Fetch active group for group-mode scoring
  useEffect(() => {
    if (!activeGroupId) { setActiveGroupData(null); return; }
    fetch(`/api/groups/${activeGroupId}`)
      .then(r => r.ok ? r.json() : null)
      .then(g => setActiveGroupData(g))
      .catch(() => setActiveGroupData(null));
  }, [activeGroupId]);

  // Group vector computed from live member list
  const groupVector = useMemo(() => {
    if (!activeGroup || activeGroup.members.length === 0) return null;
    return computeGroupVector(activeGroup.members.map(m => m.vector));
  }, [activeGroup]);

  const villageById = useMemo(() => {
    return new Map(villages.map(v => [v.id, v]));
  }, [villages]);

  const scoredMatches = useMemo<ScoredExperience[]>(() => {
    if (personality) {
      return experiences
        .map(exp => ({
          ...exp,
          score: matchScore(personality.vector, exp.personalityWeights),
        }))
        .sort((a, b) => b.score - a.score);
    }
    if (matches.length > 0) {
      return matches;
    }
    return experiences.map(exp => ({ ...exp, score: 0 }));
  }, [personality, matches, experiences]);

  const selectedVillage = selectedVillageId ? villageById.get(selectedVillageId) ?? null : null;

  const filteredMatches = useMemo(() => {
    let res = scoredMatches;
    if (filterType !== 'All') {
      res = res.filter(m => m.type === filterType);
    }
    if (freeOnly) {
      res = res.filter(m => m.isFree || m.price === 0);
    }
    if (activeOnly) {
      res = res.filter(m => m.isActive);
    }
    if (selectedVillageId) {
      res = res.filter(m => m.villageId === selectedVillageId);
    }
    if (sortBy === 'price') {
      res = [...res].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'cws') {
      res = [...res].sort((a, b) => {
        const vA = villageById.get(a.villageId)?.cws || 100;
        const vB = villageById.get(b.villageId)?.cws || 100;
        return vA - vB;
      });
    } else {
      res = [...res].sort((a, b) => b.score - a.score);
    }
    return res;
  }, [scoredMatches, filterType, freeOnly, activeOnly, sortBy, selectedVillageId, villageById]);

  const suggestedRoutes = useMemo(() => {
    return scoredMatches.slice(0, 3);
  }, [scoredMatches]);

  const avgCws = useMemo(() => {
    if (villages.length === 0) return 0;
    return Math.round(villages.reduce((sum, v) => sum + v.cws, 0) / villages.length);
  }, [villages]);

  const handleSurprisePick = () => {
    if (villages.length === 0) return;
    const pool = selectedVillageId && villages.length > 1
      ? villages.filter(v => v.id !== selectedVillageId)
      : villages;
    const randomVillage = pool[Math.floor(Math.random() * pool.length)];
    setSelectedVillageId(randomVillage.id);
  };

  const handleClearFocus = () => {
    setSelectedVillageId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 pt-[60px] md:pt-[72px]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8 pb-28 md:pb-16">
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-5 sm:gap-6">
          <section className="xl:col-span-7 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6 transition-all hover:bg-white/80">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#0B6E2A] mb-1">Discover</p>
                <h1 className="font-bold tracking-tighter text-3xl sm:text-4xl md:text-5xl text-[#1A2E1C] leading-[1.1]">Start with the globe</h1>
                <p className="text-[#1A2E1C]/65 text-[14px] sm:text-[15px] mt-2 max-w-[46ch] font-medium leading-relaxed">
                  Pick a village first. The trip list updates instantly to match that place.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={handleSurprisePick}
                  className="inline-flex w-full sm:w-auto items-center justify-center bg-[#0B6E2A] text-white text-[13px] font-semibold tracking-wide rounded-full px-5 py-3 hover:bg-[#095A22] transition-all shadow-md active:scale-95 shadow-[#0B6E2A]/20"
                >
                  Surprise me
                </button>
                <button
                  type="button"
                  onClick={handleClearFocus}
                  disabled={!selectedVillageId}
                  className="inline-flex w-full sm:w-auto items-center justify-center bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[13px] font-semibold tracking-wide rounded-full px-5 py-3 hover:bg-white transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear focus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Villages</p>
                <p className="font-bold tracking-tighter text-xl sm:text-3xl text-[#1A2E1C]">{villages.length}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Matches</p>
                <p className="font-bold tracking-tighter text-xl sm:text-3xl text-[#1A2E1C]">{filteredMatches.length}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Avg CWS</p>
                <p className="font-bold tracking-tighter text-xl sm:text-3xl text-[#1A2E1C]">{avgCws}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Focus</p>
                <p className="font-bold tracking-tighter text-xl sm:text-3xl text-[#1A2E1C]">{selectedVillage ? '1' : '0'}</p>
              </div>
            </div>

            <div className="w-full h-[320px] sm:h-[400px] md:h-[480px] rounded-[20px] sm:rounded-[24px] overflow-hidden border border-[#D6DCCD]/60 shadow-inner relative">
              <VillageMap
                onSelectVillage={v => setSelectedVillageId(v.id)}
                seedStatus={seedStatus}
                villages={villages}
                selectedVillageId={selectedVillageId}
              />
            </div>
          </section>

          <section className="xl:col-span-5 flex flex-col gap-5 sm:gap-6 lg:mt-0">
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 md:p-8 transition-all hover:bg-white/80 h-full flex flex-col justify-between">
              {selectedVillage ? (
                <>
                  <div className="mb-6">
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#0B6E2A] mb-2 sm:mb-3">Selected node</p>
                    <h2 className="font-bold tracking-tighter text-3xl sm:text-4xl text-[#1A2E1C] leading-[1.1]">{selectedVillage.name}</h2>
                    <p className="text-[#1A2E1C]/60 text-sm sm:text-[15px] mt-2 font-medium tracking-tight">
                      {selectedVillage.region}
                    </p>
                    <p className="text-[#1A2E1C]/70 text-[14px] sm:text-[15px] mt-4 line-clamp-4 leading-relaxed">{selectedVillage.description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-5 border-t border-[rgba(0,0,0,0.05)]">
                    <span className="text-[10px] sm:text-[11px] text-[#1A2E1C]/50 font-bold tracking-widest uppercase">Community signal</span>
                    <span className="font-bold tracking-tighter text-xl sm:text-2xl" style={{ color: cwsColor(selectedVillage.cws) }}>
                      {selectedVillage.cws} · <span className="text-sm tracking-tight">{cwsLabel(selectedVillage.cws)}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] text-[#1A2E1C]/60">
                   <p className="text-[15px] sm:text-base font-medium leading-relaxed max-w-[28ch]">Click a village on the map to lock recommendations to one place.</p>
                </div>
              )}
            </div>

            {suggestedRoutes.length > 0 && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 md:p-8 flex flex-col gap-4 transition-all hover:bg-white/80">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#0B6E2A] mb-1">Suggested routes</p>
                {suggestedRoutes.map((route, i) => (
                  <div key={route.id} className={`flex flex-row items-center justify-between gap-4 ${i > 0 ? 'border-t border-[#D6DCCD]/40 pt-4' : ''}`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold tracking-tight text-lg sm:text-xl text-[#1A2E1C] leading-[1.1] truncate">{route.name}</h3>
                      <p className="text-[#1A2E1C]/60 text-[12px] sm:text-[13px] font-medium tracking-tight mt-1 truncate">{villageById.get(route.villageId)?.name || 'Unknown village'}</p>
                    </div>
                    <Link
                      href={`/experience/${route.id}`}
                      className="bg-[#0B6E2A] text-white text-[12px] sm:text-[13px] font-semibold tracking-wide px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:bg-[#095A22] transition-all shadow-md active:scale-95 shrink-0"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Group mode banner */}
        {activeGroup && groupVector && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#0B6E2A]/30 bg-[#0B6E2A]/10 px-4 py-3">
            <span className="text-[#0B6E2A] text-lg">👥</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-[#1A2E1C]">{activeGroup.name}</span>
              <span className="text-xs text-[#1A2E1C]/60 ml-2">
                {activeGroup.members.length} members · Group % score active
              </span>
            </div>
            <button onClick={() => router.push(`/group/${activeGroup.id}`)}
              className="text-xs text-[#0B6E2A] font-semibold hover:underline shrink-0">
              Details →
            </button>
            <button onClick={() => setActiveGroup(null)}
              className="text-xs text-[#1A2E1C]/40 hover:text-[#1A2E1C]/70 shrink-0 ml-1">
              ✕
            </button>
          </div>
        )}

        <section id="discover-feed" className="mt-6 sm:mt-8 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 md:p-8 mb-4 sm:mb-20 transition-all hover:bg-white/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 md:mb-8">
            <div>
              <h3 className="font-bold tracking-tighter text-2xl sm:text-3xl md:text-4xl text-[#1A2E1C] leading-[1.1]">Trips you can actually book</h3>
              <p className="text-[#1A2E1C]/65 text-[14px] sm:text-[15px] font-medium tracking-tight mt-1.5 sm:mt-2">
                {activeGroup ? `Scored for ${activeGroup.name} · Sorted by group fit` : 'Sorted by fit, cost, or community impact.'}
              </p>
            </div>
            <div className="flex w-full md:w-auto overflow-x-auto gap-2 bg-[#E5E9DF]/70 p-1.5 sm:p-2 rounded-full border border-white/50 shadow-sm scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
              {(['match', 'price', 'cws'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`shrink-0 text-[11px] sm:text-[12px] md:text-[13px] font-bold uppercase tracking-widest px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all ${sortBy === s ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#1A2E1C] scale-105' : 'text-[#1A2E1C]/50 hover:text-[#1A2E1C]/80'}`}
                >
                  {s === 'match' ? 'Best match' : s === 'price' ? 'Lowest price' : 'Impact first'}
                </button>
              ))}
            </div>
          </div>

          {destination && seedStatus !== 'done' && experiences.length === 0 && (
            <div className="mb-6 rounded-[20px] border border-[#F5A623]/30 bg-[#F5A623]/10 p-4 sm:p-5 text-[14px] sm:text-[15px] font-medium text-[#7A3E00]">
              No local dataset found for {destination}. Add villages/experiences for this country or choose a location covered by the current JSON files.
            </div>
          )}

          <div className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-4 mb-4 sm:mb-6 scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0">
            {FILTERS.map(t => (
              <button
                key={t}
                onClick={() => { setFilterType(t); if (t === 'volunteer') setActiveOnly(true); else setActiveOnly(false); }}
                className={`shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[12px] sm:text-[13px] font-bold uppercase tracking-widest transition-all shadow-sm ${filterType === t ? 'bg-[#0B6E2A] text-white shadow-[#0B6E2A]/20 scale-[1.02]' : 'bg-white/60 border border-white/50 text-[#1A2E1C]/60 hover:bg-white active:scale-95'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFreeOnly(f => !f)}
              className={`shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-[12px] sm:text-[13px] font-bold uppercase tracking-widest transition-all shadow-sm ${freeOnly ? 'bg-[#0B6E2A] text-white shadow-[#0B6E2A]/20 scale-[1.02]' : 'bg-white/60 border border-white/50 text-[#1A2E1C]/60 hover:bg-white active:scale-95'}`}
            >
              Free
            </button>
          </div>

          {freeSightseeing.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#0B6E2A] mb-3">Free to visit</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0 pb-2">
                {freeSightseeing.slice(0, 6).map(s => (
                  <Link key={s.id} href={`/experience/${s.id}`}
                    className="shrink-0 bg-white/70 border border-[#D6DCCD]/60 rounded-[20px] p-4 w-52 flex flex-col gap-1 hover:bg-white transition-all shadow-sm">
                    <span className="text-2xl">🏛️</span>
                    <p className="font-bold text-[14px] text-[#1A2E1C] leading-tight line-clamp-2">{s.name}</p>
                    <span className="text-[11px] font-bold text-[#0B6E2A]">Free</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeVolunteering.length > 0 && (
            <div className={`mb-6 ${volunteerIntent ? 'order-first' : ''}`}>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#F5A623] mb-3">
                {volunteerIntent ? '⬆ Volunteering — your priority' : 'Volunteer now'}
              </p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0 pb-2">
                {activeVolunteering.slice(0, 6).map(v => (
                  <Link key={v.id} href={`/experience/${v.id}`}
                    className="shrink-0 bg-white/70 border border-[#F5A623]/30 rounded-[20px] p-4 w-52 flex flex-col gap-1 hover:bg-white transition-all shadow-sm">
                    <span className="text-2xl">♻️</span>
                    <p className="font-bold text-[14px] text-[#1A2E1C] leading-tight line-clamp-2">{v.name}</p>
                    {v.startDate && <span className="text-[11px] text-[#1A2E1C]/50">{v.startDate}{v.endDate ? ` – ${v.endDate}` : ''}</span>}
                    {v.spotsRemaining !== undefined && (
                      <span className={`text-[11px] font-bold ${v.spotsRemaining <= 2 ? 'text-red-500' : 'text-[#1A2E1C]/50'}`}>{v.spotsRemaining} spots left</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {filteredMatches.slice(0, 10).map(exp => {
              const village = villageById.get(exp.villageId);
              if (!village) return null;
              const pct = Math.round(Math.min(99, exp.score * 100));
              const groupPct = groupVector
                ? Math.round(Math.min(99, matchScore(groupVector, exp.personalityWeights) * 100))
                : null;

              return (
                <article key={exp.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 transition-transform md:hover:scale-[1.02] hover:bg-white/80">
                  <div className="flex items-start justify-between gap-3 sm:gap-5">
                    <div className="flex-1 pr-2">
                      <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.14em] text-[#0B6E2A] mb-1 sm:mb-1.5">{village.region}</p>
                      <h4 className="font-bold tracking-tighter text-xl sm:text-2xl text-[#1A2E1C] leading-tight">{exp.name}</h4>
                      <p className="text-[#1A2E1C]/60 text-[13px] sm:text-[14px] font-medium tracking-tight mt-1">{village.name}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {pct > 0 && (
                        <span className="bg-white border border-[#D6DCCD]/40 shadow-sm text-[#0B6E2A] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-bold tracking-widest">{pct}% fit</span>
                      )}
                      {groupPct !== null && (
                        <span className="bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-bold tracking-widest">👥 {groupPct}%</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#1A2E1C]/65 text-[14px] sm:text-[15px] font-medium leading-relaxed line-clamp-3">{exp.description}</p>

                  <div className="flex flex-wrap items-center gap-2 justify-between text-[12px] sm:text-[13px] font-semibold tracking-wide text-[#1A2E1C]/60 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                    <span className="capitalize px-2.5 py-1 sm:px-3 bg-[#E5E9DF]/70 rounded-md">{exp.type}</span>
                    <span>EUR {exp.price} · {exp.duration}</span>
                    <span style={{ color: cwsColor(village.cws) }}>CWS {village.cws}</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Link
                      href={`/experience/${exp.id}`}
                      className="bg-[#1A2E1C] text-white text-[12px] sm:text-[13px] font-bold tracking-widest uppercase px-5 py-2.5 sm:px-6 sm:py-3 rounded-full hover:bg-[#2A412D] transition-all shadow-md active:scale-95 w-full sm:w-auto text-center"
                    >
                      View route
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredMatches.length === 0 && (
            <div className="text-center py-10 text-[#1A2E1C]/70">No experiences found for the current globe node and filter.</div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
