'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import VillageMap from '@/components/VillageMap';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="page-standard min-h-screen"
    >
      <div className="page-shell pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <section className="xl:col-span-7 surface-card rounded-[22px] p-4 md:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#1A2E1C]/65">Discover</p>
                <h1 className="font-display text-3xl md:text-4xl text-[#1A2E1C] leading-tight mt-1">Start with the globe</h1>
                <p className="text-[#1A2E1C]/70 text-sm md:text-base mt-2 max-w-[46ch]">
                  Pick a village first. The trip list updates instantly to match that place.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSurprisePick}
                  className="bg-[#0B6E2A] text-white text-sm font-semibold rounded-pill px-4 py-2 hover:bg-[#095A22] transition-colors"
                >
                  Surprise me
                </button>
                <button
                  onClick={() => setSelectedVillageId(null)}
                  className="border border-[#D6DCCD] text-[#1A2E1C]/70 text-sm rounded-pill px-4 py-2 hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors"
                >
                  Clear focus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[12px] px-3 py-2">
                <p className="text-[#1A2E1C]/65 text-[10px] uppercase">Villages</p>
                <p className="font-display text-2xl text-[#1A2E1C]">{villages.length}</p>
              </div>
              <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[12px] px-3 py-2">
                <p className="text-[#1A2E1C]/65 text-[10px] uppercase">Matches</p>
                <p className="font-display text-2xl text-[#1A2E1C]">{filteredMatches.length}</p>
              </div>
              <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[12px] px-3 py-2">
                <p className="text-[#1A2E1C]/65 text-[10px] uppercase">Avg CWS</p>
                <p className="font-display text-2xl text-[#1A2E1C]">{avgCws}</p>
              </div>
              <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[12px] px-3 py-2">
                <p className="text-[#1A2E1C]/65 text-[10px] uppercase">Focus</p>
                <p className="font-display text-2xl text-[#1A2E1C]">{selectedVillage ? '1' : '0'}</p>
              </div>
            </div>

            <div className="w-full rounded-[14px] overflow-hidden border border-[#D6DCCD]" style={{ height: 420 }}>
              <VillageMap
                onSelectVillage={v => setSelectedVillageId(v.id)}
                seedStatus={seedStatus}
              />
            </div>
          </section>

          <section className="xl:col-span-5 surface-card rounded-[22px] p-4 md:p-6 flex flex-col gap-4">
            <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[14px] p-4">
              {selectedVillage ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#1A2E1C]/65 mb-2">Selected node</p>
                  <h2 className="font-display text-2xl text-[#1A2E1C] leading-tight">{selectedVillage.name}</h2>
                  <p className="text-[#1A2E1C]/70 text-sm mt-1">
                    {selectedVillage.region}
                  </p>
                  <p className="text-[#1A2E1C]/70 text-sm mt-3 line-clamp-2">{selectedVillage.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-[#1A2E1C]/65 uppercase">Community signal</span>
                    <span className="font-semibold" style={{ color: cwsColor(selectedVillage.cws) }}>
                      {selectedVillage.cws} · {cwsLabel(selectedVillage.cws)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[#1A2E1C]/70 text-sm">Click a village on the map to lock recommendations to one place.</p>
              )}
            </div>

            {suggestedRoutes.length > 0 && (
              <div className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[14px] p-4 flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#1A2E1C]/65">Suggested routes</p>
                {suggestedRoutes.map((route, i) => (
                  <div key={route.id} className={`flex flex-wrap items-center justify-between gap-3 ${i > 0 ? 'border-t border-[#D6DCCD] pt-3' : ''}`}>
                    <div>
                      <h3 className="font-display text-lg text-[#1A2E1C] leading-tight">{route.name}</h3>
                      <p className="text-[#1A2E1C]/70 text-sm mt-0.5">{villageById.get(route.villageId)?.name || 'Unknown village'}</p>
                    </div>
                    <Link
                      href={`/experience/${route.id}`}
                      className="bg-[#0B6E2A] text-white font-semibold px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors"
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
                {activeGroup.members.length} членове · Group % score активен
              </span>
            </div>
            <button onClick={() => router.push(`/group/${activeGroup.id}`)}
              className="text-xs text-[#0B6E2A] font-semibold hover:underline shrink-0">
              Детайли →
            </button>
            <button onClick={() => setActiveGroup(null)}
              className="text-xs text-[#1A2E1C]/40 hover:text-[#1A2E1C]/70 shrink-0 ml-1">
              ✕
            </button>
          </div>
        )}

        <section id="discover-feed" className="mt-7 surface-card rounded-[22px] p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display text-3xl text-[#1A2E1C]">Trips you can actually book</h3>
              <p className="text-[#1A2E1C]/70 text-sm mt-1">
                {activeGroup ? `Scored for ${activeGroup.name} · Sorted by group fit` : 'Sorted by fit, cost, or community impact.'}
              </p>
            </div>
            <div className="flex gap-2">
              {(['match', 'price', 'cws'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs px-3 py-2 rounded-pill border transition-colors ${sortBy === s ? 'border-[#0B6E2A] text-[#0B6E2A] bg-[#0B6E2A]/10' : 'border-[#D6DCCD] text-[#1A2E1C]/70 hover:border-[#A8B09F]'}`}
                >
                  {s === 'match' ? 'Best match' : s === 'price' ? 'Lowest price' : 'Impact first'}
                </button>
              ))}
            </div>
          </div>

          {destination && seedStatus !== 'done' && experiences.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[#D9C8B2] bg-[#FFF5E9] p-4 text-sm text-[#7A3E00]">
              No local dataset found for {destination}. Add villages/experiences for this country or choose a location covered by the current JSON files.
            </div>
          )}

          <div className="flex overflow-x-auto gap-2 pb-3 mb-4">
            {FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`shrink-0 px-4 py-2 rounded-pill text-xs font-medium transition-colors ${filterType === t ? 'bg-[#0B6E2A] text-white' : 'bg-[#F4EDE2] border border-[#D6DCCD] text-[#1A2E1C]/70 hover:border-[#A8B09F]'}`}
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
                <article key={exp.id} className="bg-[#F4EDE2] border border-[#D6DCCD] rounded-[16px] p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#1A2E1C]/65 mb-1">{village.region}</p>
                      <h4 className="font-display text-2xl text-[#1A2E1C] leading-tight">{exp.name}</h4>
                      <p className="text-[#1A2E1C]/70 text-sm mt-1">{village.name}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <span className="bg-[#0B6E2A]/15 text-[#0B6E2A] px-3 py-1 rounded-pill text-xs font-semibold">{pct}% fit</span>
                      {groupPct !== null && (
                        <span className="bg-amber-400/20 text-amber-700 px-3 py-1 rounded-pill text-xs font-semibold">👥 {groupPct}%</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[#1A2E1C]/70 text-sm line-clamp-3">{exp.description}</p>

                  <div className="flex items-center justify-between text-xs text-[#1A2E1C]/70">
                    <span className="capitalize px-2.5 py-1 rounded-pill border border-[#D6DCCD]">{exp.type}</span>
                    <span>EUR {exp.price} · {exp.duration}</span>
                    <span style={{ color: cwsColor(village.cws) }}>CWS {village.cws}</span>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/experience/${exp.id}`}
                      className="bg-[#0B6E2A] text-white font-semibold px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors"
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
