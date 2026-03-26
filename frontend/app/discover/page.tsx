'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import VillageMap from '@/components/VillageMap';
import { useApp } from '@/app/lib/store';
import { Experience, Village, EXPERIENCES, VILLAGES } from '@/app/lib/data';
import { cwsColor, cwsLabel } from '@/app/lib/utils';
import { matchScore } from '@/app/lib/hmm';

const FILTERS = ['All', 'craft', 'hike', 'homestay', 'ceremony', 'cooking', 'volunteer', 'folklore', 'sightseeing'] as const;

type ScoredExperience = Experience & { score: number };


export default function DiscoverPage() {
  const { personality, matches, setMatches, seedStatus } = useApp();
  const [filterType, setFilterType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'cws'>('match');
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [villages, setVillages] = useState<Village[]>(VILLAGES);
  const [experiences, setExperiences] = useState<Experience[]>(EXPERIENCES);

  useEffect(() => {
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
  }, [seedStatus]);

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
      className="min-h-[calc(100vh-3.5rem)] bg-[radial-gradient(circle_at_12%_6%,#1E2A1D_0%,transparent_28%),radial-gradient(circle_at_88%_12%,#2A2114_0%,transparent_26%),#090A0B]"
    >
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <section className="xl:col-span-7 bg-[#101418] border border-[#27313A] rounded-[22px] p-4 md:p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-3">Discover</p>
                <h1 className="font-display text-3xl md:text-4xl text-white leading-tight mt-1">Start with the globe</h1>
                <p className="text-text-2 text-sm md:text-base mt-2 max-w-[46ch]">
                  Pick a village first. The trip list updates instantly to match that place.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSurprisePick}
                  className="bg-accent text-black text-sm font-semibold rounded-pill px-4 py-2 hover:bg-accent-dim transition-colors"
                >
                  Surprise me
                </button>
                <button
                  onClick={() => setSelectedVillageId(null)}
                  className="border border-[#3A4854] text-text-2 text-sm rounded-pill px-4 py-2 hover:border-[#586A7A] hover:text-white transition-colors"
                >
                  Clear focus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-[#121A16] border border-[#253129] rounded-[12px] px-3 py-2">
                <p className="text-text-3 text-[10px] uppercase">Villages</p>
                <p className="font-display text-2xl text-white">{villages.length}</p>
              </div>
              <div className="bg-[#121A16] border border-[#253129] rounded-[12px] px-3 py-2">
                <p className="text-text-3 text-[10px] uppercase">Matches</p>
                <p className="font-display text-2xl text-white">{filteredMatches.length}</p>
              </div>
              <div className="bg-[#121A16] border border-[#253129] rounded-[12px] px-3 py-2">
                <p className="text-text-3 text-[10px] uppercase">Avg CWS</p>
                <p className="font-display text-2xl text-white">{avgCws}</p>
              </div>
              <div className="bg-[#121A16] border border-[#253129] rounded-[12px] px-3 py-2">
                <p className="text-text-3 text-[10px] uppercase">Focus</p>
                <p className="font-display text-2xl text-white">{selectedVillage ? '1' : '0'}</p>
              </div>
            </div>

            <div className="w-full rounded-[14px] overflow-hidden border border-[#385047]" style={{ height: 420 }}>
              <VillageMap
                onSelectVillage={v => setSelectedVillageId(v.id)}
                seedStatus={seedStatus}
              />
            </div>
          </section>

          <section className="xl:col-span-5 bg-[#10151B] border border-[#2A3641] rounded-[22px] p-4 md:p-6 flex flex-col gap-4">
            <div className="bg-[#121920] border border-[#2A3946] rounded-[14px] p-4">
              {selectedVillage ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-3 mb-2">Selected node</p>
                  <h2 className="font-display text-2xl text-white leading-tight">{selectedVillage.name}</h2>
                  <p className="text-text-2 text-sm mt-1">
                    {selectedVillage.region}
                  </p>
                  <p className="text-text-2 text-sm mt-3 line-clamp-2">{selectedVillage.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-text-3 uppercase">Community signal</span>
                    <span className="font-semibold" style={{ color: cwsColor(selectedVillage.cws) }}>
                      {selectedVillage.cws} · {cwsLabel(selectedVillage.cws)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-text-2 text-sm">Click a village on the map to lock recommendations to one place.</p>
              )}
            </div>

            {suggestedRoutes.length > 0 && (
              <div className="bg-[#0F151C] border border-[#2A3742] rounded-[14px] p-4 flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-text-3">Suggested routes</p>
                {suggestedRoutes.map((route, i) => (
                  <div key={route.id} className={`flex flex-wrap items-center justify-between gap-3 ${i > 0 ? 'border-t border-[#1E2D3A] pt-3' : ''}`}>
                    <div>
                      <h3 className="font-display text-lg text-white leading-tight">{route.name}</h3>
                      <p className="text-text-2 text-sm mt-0.5">{villageById.get(route.villageId)?.name || 'Unknown village'}</p>
                    </div>
                    <Link
                      href={`/experience/${route.id}`}
                      className="bg-accent text-black font-semibold px-4 py-2 rounded-pill hover:bg-accent-dim transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section id="discover-feed" className="mt-7 bg-[#101419] border border-[#222F3A] rounded-[22px] p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display text-3xl text-white">Trips you can actually book</h3>
              <p className="text-text-2 text-sm mt-1">Sorted by fit, cost, or community impact.</p>
            </div>
            <div className="flex gap-2">
              {(['match', 'price', 'cws'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs px-3 py-2 rounded-pill border transition-colors ${sortBy === s ? 'border-accent text-accent bg-accent/10' : 'border-[#31404B] text-text-2 hover:border-[#4C6072]'}`}
                >
                  {s === 'match' ? 'Best match' : s === 'price' ? 'Lowest price' : 'Impact first'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-3 mb-4">
            {FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`shrink-0 px-4 py-2 rounded-pill text-xs font-medium transition-colors ${filterType === t ? 'bg-accent text-black' : 'bg-[#151D25] border border-[#2E3C48] text-text-2 hover:border-[#4D6074]'}`}
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

              return (
                <article key={exp.id} className="bg-[#111820] border border-[#2A3742] rounded-[16px] p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-text-3 mb-1">{village.region}</p>
                      <h4 className="font-display text-2xl text-white leading-tight">{exp.name}</h4>
                      <p className="text-text-2 text-sm mt-1">{village.name}</p>
                    </div>
                    <span className="bg-accent/20 text-accent px-3 py-1 rounded-pill text-xs font-semibold">{pct}% fit</span>
                  </div>

                  <p className="text-text-2 text-sm line-clamp-3">{exp.description}</p>

                  <div className="flex items-center justify-between text-xs text-text-2">
                    <span className="capitalize px-2.5 py-1 rounded-pill border border-[#344350]">{exp.type}</span>
                    <span>EUR {exp.price} · {exp.duration}</span>
                    <span style={{ color: cwsColor(village.cws) }}>CWS {village.cws}</span>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/experience/${exp.id}`}
                      className="bg-accent text-black font-semibold px-4 py-2 rounded-pill hover:bg-accent-dim transition-colors"
                    >
                      View route
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredMatches.length === 0 && (
            <div className="text-center py-10 text-text-2">No experiences found for the current globe node and filter.</div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
