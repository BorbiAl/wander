'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { ExperienceCard } from '@/components/ExperienceCard';
import { PersonalityRadar } from '@/components/PersonalityRadar';
import { Village, EXPERIENCES } from '@/app/lib/data';
import { getVillage } from '@/app/lib/utils';
import { matchScore } from '@/app/lib/hmm';
import { CommunityExperiences } from '@/components/CommunityExperiences';

const VillageMap = dynamic(() => import('@/components/VillageMap'), { ssr: false });

export default function DiscoverPage() {
  const { personality, matches, setMatches, seedStatus } = useApp();
  const [filterType, setFilterType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match'|'price'|'cws'>('match');
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);

  // Re-score against the in-memory EXPERIENCES array (which has been patched
  // with seeded destination data client-side) instead of hitting the server,
  // which only ever sees the static Bulgarian fallback data.
  useEffect(() => {
    if (!personality) return;
    const scored = EXPERIENCES.map(exp => ({
      ...exp,
      score: matchScore(personality.vector, exp.personalityWeights),
    })).sort((a, b) => b.score - a.score);
    if (scored.length > 0) setMatches(scored);
  // Re-run when seed completes so Mexico data replaces Bulgarian fallback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personality?.dominant, seedStatus]);

  const types = ['All', 'craft', 'hike', 'homestay', 'ceremony', 'cooking', 'volunteer', 'folklore', 'sightseeing'];

  const filteredMatches = useMemo(() => {
    let res = matches;
    if (filterType !== 'All') {
      res = res.filter(m => m.type === filterType);
    }
    if (selectedVillage) {
      res = res.filter(m => m.villageId === selectedVillage.id);
    }
    if (sortBy === 'price') {
      res = [...res].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'cws') {
      // Sort by CWS impact (lower CWS = higher impact)
      res = [...res].sort((a, b) => {
        const vA = getVillage(a.villageId)?.cws || 100;
        const vB = getVillage(b.villageId)?.cws || 100;
        return vA - vB;
      });
    } else {
      res = [...res].sort((a, b) => b.score - a.score);
    }
    return res;
  }, [matches, filterType, sortBy, selectedVillage]);

  if (!personality) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <p className="text-text-2 mb-4">You need to complete onboarding first.</p>
        <button onClick={() => window.location.href = '/onboarding'} className="bg-accent text-black px-6 py-2 rounded-pill">Complete Onboarding</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)]"
    >
      {/* Map Section */}
      <div className="w-full md:w-[55%] h-[250px] md:h-full relative border-b md:border-b-0 md:border-r border-[#222]">
        <VillageMap onSelectVillage={setSelectedVillage} seedStatus={seedStatus} />
      </div>

      {/* Sidebar Section */}
      <div className="w-full md:w-[45%] h-full overflow-y-auto bg-bg p-4 md:p-6 flex flex-col gap-6">
        
        {/* Personality Banner */}
        <div className="bg-surface border border-[#222] rounded-card p-5 flex flex-col items-center text-center">
          <h2 className="font-display text-2xl text-white mb-1">
            You are a <span className="text-accent">{personality.dominant}</span>
          </h2>
          <p className="text-text-2 text-sm mb-4">Showing experiences matched to your profile</p>
          <div className="w-32 h-32 mb-2">
            <PersonalityRadar vector={personality.vector} size={128} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-lg">Experiences</h3>
            {selectedVillage && (
              <button 
                onClick={() => setSelectedVillage(null)}
                className="text-xs text-accent hover:underline"
              >
                Clear village filter
              </button>
            )}
          </div>
          
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`shrink-0 px-4 py-1.5 rounded-pill text-xs font-medium transition-colors ${filterType === t ? 'bg-accent text-black' : 'bg-surface-2 border border-[#333] text-text-2 hover:border-[#555]'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <span className="text-text-3 text-xs self-center mr-2">Sort by:</span>
            {['match', 'price', 'cws'].map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s as any)}
                className={`text-xs px-3 py-1 rounded-pill border transition-colors ${sortBy === s ? 'border-accent text-accent bg-accent/10' : 'border-[#333] text-text-2 hover:border-[#555]'}`}
              >
                {s === 'match' ? 'Best match' : s === 'price' ? 'Price ↑' : 'CWS impact'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3 pb-20 md:pb-0">
          {filteredMatches.length === 0 ? (
            <div className="text-center text-text-3 py-8">No experiences found for this filter.</div>
          ) : (
            filteredMatches.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} />
            ))
          )}
          {filteredMatches.length > 0 && (
            <button className="w-full py-3 mt-2 text-sm text-text-2 border border-[#333] rounded-pill hover:text-white hover:border-[#555] transition-colors">
              Show more
            </button>
          )}

          {/* Community experiences — loads when a village is selected on the map */}
          {selectedVillage && (
            <CommunityExperiences villageName={selectedVillage.name} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
