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
  const { personality, matches, setMatches, seedStatus, destination, activeGroupId, setActiveGroup } = useApp();
  const [filterType, setFilterType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'cws'>('match');
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
  }, [scoredMatches, filterType, sortBy, selectedVillageId, villageById]);

  const suggestedRoutes = useMemo(() => {
    return scoredMatches.slice(0, 3);
  }, [scoredMatches]);

  const avgCws = useMemo(() => {
    if (villages.length === 0) return 0;
    return Math.round(villages.reduce((sum, v) => sum + v.cws, 0) / villages.length);
  }, [villages]);

  const handleSurprisePick = () => {
    if (villages.length === 0) return;
    const randomVillage = villages[Math.floor(Math.random() * villages.length)];
    setSelectedVillageId(randomVillage.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <section className="xl:col-span-7 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[32px] p-6 md:p-8 flex flex-col gap-6 transition-all hover:bg-white/80">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-[#1A2E1C]/50">Discover</p>
                <h1 className="font-bold tracking-tighter text-3xl md:text-5xl text-[#1A2E1C] leading-[1.1] mt-1">Start with the globe</h1>
                <p className="text-[#1A2E1C]/60 text-sm md:text-base mt-3 max-w-[46ch] font-medium leading-relaxed">
                  Pick a village first. The trip list updates instantly to match that place.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSurprisePick}
                  className="bg-[#0B6E2A] text-white text-[13px] font-semibold tracking-wide rounded-full px-5 py-2.5 hover:bg-[#095A22] transition-all shadow-md hover:scale-105 active:scale-95 shadow-[#0B6E2A]/20"
                >
                  Surprise me
                </button>
                <button
                  onClick={() => setSelectedVillageId(null)}
                  className="bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[13px] font-semibold tracking-wide rounded-full px-5 py-2.5 hover:bg-white transition-all shadow-sm active:scale-95"
                >
                  Clear focus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[20px] px-5 py-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[10px] font-bold uppercase tracking-widest mb-1">Villages</p>
                <p className="font-bold tracking-tighter text-3xl text-[#1A2E1C]">{villages.length}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[20px] px-5 py-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[10px] font-bold uppercase tracking-widest mb-1">Matches</p>
                <p className="font-bold tracking-tighter text-3xl text-[#1A2E1C]">{filteredMatches.length}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[20px] px-5 py-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[10px] font-bold uppercase tracking-widest mb-1">Avg CWS</p>
                <p className="font-bold tracking-tighter text-3xl text-[#1A2E1C]">{avgCws}</p>
              </div>
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[20px] px-5 py-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                <p className="text-[#1A2E1C]/50 text-[10px] font-bold uppercase tracking-widest mb-1">Focus</p>
                <p className="font-bold tracking-tighter text-3xl text-[#1A2E1C]">{selectedVillage ? '1' : '0'}</p>
              </div>
            </div>

            <div className="w-full rounded-[24px] overflow-hidden border border-[#D6DCCD]/60 shadow-inner" style={{ height: 420 }}>
              <VillageMap
                onSelectVillage={v => setSelectedVillageId(v.id)}
                seedStatus={seedStatus}
              />
            </div>
          </section>

          <section className="xl:col-span-5 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[32px] p-6 md:p-8 flex flex-col gap-5 transition-all hover:bg-white/80">
            <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[24px] p-6">
              {selectedVillage ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#1A2E1C]/50 mb-3">Selected node</p>
                  <h2 className="font-bold tracking-tighter text-3xl text-[#1A2E1C] leading-[1.1]">{selectedVillage.name}</h2>
                  <p className="text-[#1A2E1C]/60 text-sm mt-1.5 font-medium tracking-tight">
                    {selectedVillage.region}
                  </p>
                  <p className="text-[#1A2E1C]/70 text-[15px] mt-4 line-clamp-3 leading-relaxed">{selectedVillage.description}</p>
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-[rgba(0,0,0,0.05)]">
                    <span className="text-[10px] text-[#1A2E1C]/50 font-bold tracking-widest uppercase">Community signal</span>
                    <span className="font-bold tracking-tighter text-lg" style={{ color: cwsColor(selectedVillage.cws) }}>
                      {selectedVillage.cws} · {cwsLabel(selectedVillage.cws)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[#1A2E1C]/60 text-[15px] font-medium leading-relaxed">Click a village on the map to lock recommendations to one place.</p>
              )}
            </div>

            {suggestedRoutes.length > 0 && (
              <div className="bg-[#E5E9DF]/70 border border-[#D6DCCD]/40 rounded-[24px] p-6 flex flex-col gap-4">
                <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#1A2E1C]/50 mb-1">Suggested routes</p>
                {suggestedRoutes.map((route, i) => (
                  <div key={route.id} className={`flex flex-wrap items-center justify-between gap-4 ${i > 0 ? 'border-t border-[#D6DCCD]/40 pt-4' : ''}`}>
                    <div>
                      <h3 className="font-bold tracking-tighter text-[22px] text-[#1A2E1C] leading-[1.1]">{route.name}</h3>
                      <p className="text-[#1A2E1C]/60 text-[13px] font-medium tracking-tight mt-1">{villageById.get(route.villageId)?.name || 'Unknown village'}</p>
                    </div>
                    <Link
                      href={`/experience/${route.id}`}
                      className="bg-[#0B6E2A] text-white text-[13px] font-semibold tracking-wide px-5 py-2.5 rounded-full hover:bg-[#095A22] transition-all shadow-md hover:scale-105 active:scale-95 shadow-[#0B6E2A]/20"
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
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#0B6E2A]/30 bg-[#0B6E2A]/10 px-4 py-3">
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

        <section id="discover-feed" className="mt-8 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[32px] p-6 md:p-10 mb-24 transition-all hover:bg-white/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
            <div>
              <h3 className="font-bold tracking-tighter text-3xl md:text-4xl text-[#1A2E1C] leading-[1.1]">Trips you can actually book</h3>
              <p className="text-[#1A2E1C]/60 text-[15px] font-medium tracking-tight mt-2">
                {activeGroup ? `Scored for ${activeGroup.name} · Sorted by group fit` : 'Sorted by fit, cost, or community impact.'}
              </p>
            </div>
            <div className="flex gap-2 bg-[#E5E9DF]/70 p-1.5 rounded-full border border-white/50 shadow-sm">
              {(['match', 'price', 'cws'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-[13px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full transition-all ${sortBy === s ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#1A2E1C] scale-105' : 'text-[#1A2E1C]/50 hover:text-[#1A2E1C]/80'}`}
                >
                  {s === 'match' ? 'Best match' : s === 'price' ? 'Lowest price' : 'Impact first'}
                </button>
              ))}
            </div>
          </div>

          {destination && seedStatus !== 'done' && experiences.length === 0 && (
            <div className="mb-6 rounded-[24px] border border-[#F5A623]/30 bg-[#F5A623]/10 p-5 text-[15px] font-medium text-[#7A3E00]">
              No local dataset found for {destination}. Add villages/experiences for this country or choose a location covered by the current JSON files.
            </div>
          )}

          <div className="flex overflow-x-auto gap-2.5 pb-4 mb-6 scrollbar-hide">
            {FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`shrink-0 px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-widest transition-all shadow-sm ${filterType === t ? 'bg-[#0B6E2A] text-white shadow-[#0B6E2A]/20 scale-[1.02]' : 'bg-white/60 border border-white/50 text-[#1A2E1C]/60 hover:bg-white active:scale-95'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMatches.slice(0, 10).map(exp => {
              const village = villageById.get(exp.villageId);
              if (!village) return null;
              const pct = Math.round(Math.min(99, exp.score * 100));
              const groupPct = groupVector
                ? Math.round(Math.min(99, matchScore(groupVector, exp.personalityWeights) * 100))
                : null;

              return (
                <article key={exp.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-6 flex flex-col gap-5 transition-transform hover:scale-[1.02] hover:bg-white/80">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#1A2E1C]/50 mb-1.5">{village.region}</p>
                      <h4 className="font-bold tracking-tighter text-2xl text-[#1A2E1C] leading-tight">{exp.name}</h4>
                      <p className="text-[#1A2E1C]/60 text-[14px] font-medium tracking-tight mt-1">{village.name}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <span className="bg-white border border-[#D6DCCD]/40 shadow-sm text-[#0B6E2A] px-3 py-1.5 rounded-full text-[12px] font-bold tracking-widest">{pct}% fit</span>
                      {groupPct !== null && (
                        <span className="bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] px-3 py-1.5 rounded-full text-[12px] font-bold tracking-widest">👥 {groupPct}%</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#1A2E1C]/60 text-[15px] font-medium leading-relaxed line-clamp-3">{exp.description}</p>

                  <div className="flex items-center justify-between text-[13px] font-semibold tracking-wide text-[#1A2E1C]/60 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                    <span className="capitalize px-3 py-1 bg-[#E5E9DF]/70 rounded-md">{exp.type}</span>
                    <span>EUR {exp.price} · {exp.duration}</span>
                    <span style={{ color: cwsColor(village.cws) }}>CWS {village.cws}</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Link
                      href={`/experience/${exp.id}`}
                      className="bg-[#1A2E1C] text-white text-[13px] font-bold tracking-widest uppercase px-6 py-2.5 rounded-full hover:bg-[#2A412D] transition-all shadow-md active:scale-95"
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
