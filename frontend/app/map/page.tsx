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
      className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#090A0B]"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#1E2830] bg-[#0B0F14] shrink-0">
        <div>
          <h1 className="font-display text-xl text-white">Village Map</h1>
          <p className="text-text-3 text-xs">{stats.total} villages · avg CWS {stats.avgCws} · {stats.pioneering} pioneer territories</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVisited(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-pill border transition-colors ${showVisited ? 'border-accent text-accent bg-accent/10' : 'border-[#2E3C48] text-text-2 hover:border-[#4D6074]'}`}
          >
            {showVisited ? 'Showing visited' : 'Show visited only'}
          </button>
          <Link
            href="/discover"
            className="bg-accent text-black text-xs font-semibold px-4 py-1.5 rounded-pill hover:bg-accent-dim transition-colors"
          >
            Browse experiences →
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
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
          className="w-80 shrink-0 border-l border-[#1E2830] bg-[#0D1117] overflow-y-auto flex flex-col"
        >
          {selectedVillage ? (
            <div className="p-5 flex flex-col gap-5">
              {/* Village header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-3">{selectedVillage.region}</span>
                  {visitedSet.has(selectedVillage.name) && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-pill">Visited</span>
                  )}
                </div>
                <h2 className="font-display text-2xl text-white leading-tight">{selectedVillage.name}</h2>
              </div>

              {/* CWS bar */}
              <div className="bg-[#121920] border border-[#1E2D3A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-2 uppercase tracking-wider">Community Signal</span>
                  <span className="font-bold text-sm" style={{ color: cwsColor(selectedVillage.cws) }}>
                    {selectedVillage.cws} · {cwsLabel(selectedVillage.cws)}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#1A2330] rounded-full overflow-hidden">
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
                <p className="text-text-2 text-sm leading-relaxed">{selectedVillage.description}</p>
              )}

              {/* Coordinates */}
              <div className="text-[11px] text-text-3 font-mono">
                {selectedVillage.lat.toFixed(4)}°N, {selectedVillage.lng.toFixed(4)}°E
              </div>

              {/* Experiences */}
              {villageExperiences.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-3 mb-3">
                    {villageExperiences.length} experience{villageExperiences.length !== 1 ? 's' : ''} available
                  </p>
                  <div className="flex flex-col gap-2">
                    {villageExperiences.map(exp => (
                      <Link
                        key={exp.id}
                        href={`/experience/${exp.id}`}
                        className="flex items-center justify-between bg-[#111820] border border-[#2A3742] rounded-xl p-3 hover:border-accent/40 transition-colors group"
                      >
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-accent transition-colors">{exp.name}</p>
                          <p className="text-text-3 text-xs mt-0.5 capitalize">{exp.type} · €{exp.price} · {exp.duration}</p>
                        </div>
                        <span className="text-accent text-xs">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/discover`}
                className="w-full text-center bg-accent text-black font-semibold px-4 py-2.5 rounded-pill hover:bg-accent-dim transition-colors text-sm"
              >
                Find matching experiences
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-white font-medium mb-1">Select a village</p>
              <p className="text-text-3 text-sm">Click any marker on the map to explore village details and available experiences.</p>

              {/* Quick stats */}
              <div className="mt-8 w-full flex flex-col gap-2">
                {[
                  { label: 'Total villages', value: stats.total },
                  { label: 'Avg CWS', value: stats.avgCws },
                  { label: 'Pioneer territories', value: stats.pioneering },
                  { label: 'Visited', value: visitedSet.size },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between text-sm border-t border-[#1A2330] pt-2">
                    <span className="text-text-2">{s.label}</span>
                    <span className="text-white font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.aside>
      </div>
    </motion.div>
  );
}
