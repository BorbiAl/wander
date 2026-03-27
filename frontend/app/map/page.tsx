'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/app/lib/store';
import { VILLAGES, EXPERIENCES } from '@/app/lib/data';
import { cwsColor, cwsLabel } from '@/app/lib/utils';

// VillageMap uses Leaflet which requires no SSR
const VillageMap = dynamic(() => import('@/components/VillageMap'), { ssr: false });

export default function MapPage() {
  const { seedStatus, villagesVisited } = useApp();
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [showVisited, setShowVisited] = useState(false);

  const villages = VILLAGES;

  const selectedVillage = useMemo(
    () => (selectedVillageId ? villages.find(v => v.id === selectedVillageId) ?? null : null),
    [selectedVillageId, villages]
  );

  const villageExperiences = useMemo(() => {
    if (!selectedVillage) return [];
    return EXPERIENCES.filter(e => e.villageId === selectedVillage.id);
  }, [selectedVillage]);

  const visitedSet = new Set(villagesVisited);

  const stats = useMemo(() => {
    const total = villages.length;
    const avgCws = total > 0 ? Math.round(villages.reduce((s, v) => s + v.cws, 0) / total) : 0;
    const pioneering = villages.filter(v => v.cws < 45).length;
    return { total, avgCws, pioneering };
  }, [villages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 flex flex-col"
    >
      {/* Top bar */}
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 flex shrink-0 flex-col items-start justify-between gap-3 border-b border-[#D6DCCD] md:flex-row md:items-center">
        <div>
          <h1 className="text-xl sm:text-3xl">Village Map</h1>
          <p className="text-muted text-xs">{stats.total} villages · avg CWS {stats.avgCws} · {stats.pioneering} pioneer territories</p>
        </div>
        <div className="flex w-full flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
          <button
            onClick={() => setShowVisited(v => !v)}
            className={`w-full sm:w-auto rounded-full border bg-white px-4 py-2 text-sm text-black transition-colors ${showVisited ? 'border-[#0B6E2A]' : 'border-[#D6DCCD] hover:border-[#A8B09F]'}`}
          >
            {showVisited ? 'Showing visited' : 'Show visited only'}
          </button>
          <Link
            href="/discover"
            className="w-full sm:w-auto text-center rounded-full bg-[#0B6E2A] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#095A22]"
          >
            Browse experiences →
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-5 sm:py-4 lg:max-w-6xl lg:items-center lg:justify-center lg:py-6">
        <div className="flex w-full flex-1 flex-col gap-3 lg:h-[76vh] lg:flex-row lg:gap-4">
          {/* Map */}
          <div className="relative h-[42vh] min-h-[240px] w-full flex-1 overflow-hidden rounded-2xl sm:rounded-3xl lg:h-auto">
            <VillageMap
              onSelectVillage={v => setSelectedVillageId(v.id)}
              visited={showVisited ? villagesVisited : []}
              seedStatus={seedStatus}
            />
          </div>

          {/* Side panel */}
          <motion.aside
            key={selectedVillageId ?? 'empty'}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl sm:rounded-3xl lg:w-72"
          >
            {selectedVillage ? (
              <div className="p-4 sm:p-5 flex flex-col gap-5">
              {/* Village header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted text-[10px] uppercase tracking-widest">{selectedVillage.region}</span>
                  {visitedSet.has(selectedVillage.name) && (
                    <span className="rounded-full bg-[#0B6E2A]/15 px-2 py-0.5 text-[10px] text-[#0B6E2A]">Visited</span>
                  )}
                </div>
                <h2 className="text-2xl leading-tight">{selectedVillage.name}</h2>
              </div>

              {/* CWS bar */}
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted text-xs uppercase tracking-wider">Community Signal</span>
                  <span className="font-bold text-sm" style={{ color: cwsColor(selectedVillage.cws) }}>
                    {selectedVillage.cws} · {cwsLabel(selectedVillage.cws)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#D6DCCD]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedVillage.cws}%`, backgroundColor: cwsColor(selectedVillage.cws) }}
                  />
                </div>
                {selectedVillage.cws < 45 && (
                  <p className="text-[11px] text-[#F5A623] mt-2">Pioneer territory — your booking has outsized impact here</p>
                )}
              </div>

              {/* Description */}
              {selectedVillage.description && (
                <p className="text-muted text-sm leading-relaxed">{selectedVillage.description}</p>
              )}

              {/* Coordinates */}
              <div className="text-muted font-mono text-[11px]">
                {selectedVillage.lat.toFixed(4)}°N, {selectedVillage.lng.toFixed(4)}°E
              </div>

              {/* Experiences */}
              {villageExperiences.length > 0 && (
                <div>
                  <p className="text-muted mb-3 text-[10px] uppercase tracking-widest">
                    {villageExperiences.length} experience{villageExperiences.length !== 1 ? 's' : ''} available
                  </p>
                  <div className="flex flex-col gap-2">
                    {villageExperiences.map(exp => (
                      <Link
                        key={exp.id}
                        href={`/experience/${exp.id}`}
                        className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm group flex items-center justify-between rounded-xl p-3 transition-colors hover:border-[#0B6E2A]/40"
                      >
                        <div>
                          <p className="text-sm font-medium transition-colors group-hover:text-[#0B6E2A]">{exp.name}</p>
                          <p className="text-muted mt-0.5 text-xs capitalize">{exp.type} · €{exp.price} · {exp.duration}</p>
                        </div>
                        <span className="text-xs text-[#0B6E2A]">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/discover`}
                className="w-full rounded-full bg-[#0B6E2A] px-5 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[#095A22]"
              >
                Find matching experiences
              </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-5 sm:p-6 text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="mb-1 font-medium">Select a village</p>
              <p className="text-muted text-sm">Click any marker on the map to explore village details and available experiences.</p>

              {/* Quick stats */}
              <div className="mt-8 w-full flex flex-col gap-2">
                {[
                  { label: 'Total villages', value: stats.total },
                  { label: 'Avg CWS', value: stats.avgCws },
                  { label: 'Pioneer territories', value: stats.pioneering },
                  { label: 'Visited', value: visitedSet.size },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between border-t border-[#D6DCCD] pt-2 text-sm">
                    <span className="text-muted">{s.label}</span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </motion.div>
  );
}
