'use client';

import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { useApp } from '@/app/lib/store';
import { PersonalityRadar } from '@/components/PersonalityRadar';
import { BadgeGrid } from '@/components/BadgeGrid';
import { PERSONALITIES, PERSONALITY_INFO, VILLAGES } from '@/app/lib/data';
import { getExperience, getVillage, cwsColor } from '@/app/lib/utils';

const VillageMap = dynamic(() => import('@/components/VillageMap'), { ssr: false });

export default function ProfilePage() {
  const { userId, personality, badges, bookings, totalImpact, villagesVisited } = useApp();

  if (!personality) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center px-4">
        <p className="text-text-2 mb-4">Complete your personality profile first.</p>
        <button onClick={() => window.location.href = '/onboarding'} className="bg-accent text-black px-6 py-2 rounded-pill">Start Onboarding</button>
      </div>
    );
  }

  const domColor = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].color;
  const domDesc = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].description;

  const uniqueRegions = Array.from(new Set(villagesVisited.map(vName => {
    const v = VILLAGES.find(vil => vil.name === vName);
    return v ? v.region : '';
  }))).filter(Boolean).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-24"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-16">
        <div className="flex-1 text-center md:text-left">
          <div className="text-text-3 text-sm mb-2">Traveler #{userId}</div>
          <h1 className="font-display text-5xl md:text-6xl mb-4" style={{ color: domColor }}>
            {personality.dominant}
          </h1>
          <p className="text-text-2 text-lg italic max-w-md mx-auto md:mx-0">
            &quot;{domDesc}&quot;
          </p>
        </div>
        <div className="w-[280px] h-[280px] shrink-0">
          <PersonalityRadar vector={personality.vector} size={280} />
        </div>
      </div>

      {/* Personality Breakdown */}
      <div className="bg-surface border border-[#222] rounded-card p-6 mb-12">
        <h2 className="font-display text-xl text-white mb-6">Your Behavioral Profile</h2>
        <div className="flex flex-col gap-4">
          {PERSONALITIES.map((p, i) => {
            const val = personality.vector[i];
            const info = PERSONALITY_INFO[p];
            const isDom = i === personality.dominantIndex;
            
            return (
              <div key={p} className={`flex items-center gap-4 ${isDom ? 'p-2 -mx-2 bg-surface-2 rounded-lg border border-[#333]' : ''}`}>
                <div className="w-28 text-sm flex items-center gap-2" style={{ color: isDom ? 'white' : '#888' }}>
                  <span>{info.emoji}</span> {p}
                </div>
                <div className="flex-1 h-2 bg-[#222] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full" 
                    style={{ backgroundColor: info.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium" style={{ color: info.color }}>
                  {Math.round(val * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-2xl text-white">Your badges</h2>
          <span className="bg-surface-2 border border-[#333] text-text-2 text-xs px-2 py-0.5 rounded-pill">
            {badges.length} earned
          </span>
        </div>
        <BadgeGrid earnedBadges={badges} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="bg-surface border border-[#222] rounded-card p-5 flex justify-between items-center">
          <span className="text-text-2">Total experiences</span>
          <span className="text-white font-display text-2xl">{bookings.length}</span>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 flex justify-between items-center">
          <span className="text-text-2">Regions explored</span>
          <span className="text-white font-display text-2xl">{uniqueRegions}</span>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 flex justify-between items-center">
          <span className="text-text-2">Total spent</span>
          <span className="text-amber font-display text-2xl">€{totalImpact.toFixed(0)}</span>
        </div>
      </div>

      {/* Visit History */}
      {villagesVisited.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-white mb-6">Villages visited</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              {villagesVisited.map(vName => {
                const village = VILLAGES.find(v => v.name === vName);
                if (!village) return null;
                const villageBookings = bookings.filter(b => b.villageName === vName);
                
                return (
                  <div key={vName} className="bg-surface border border-[#222] rounded-card p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-display text-xl text-white mb-1">{village.name}</h3>
                        <span className="text-[10px] uppercase text-text-2 bg-surface-2 px-2 py-0.5 rounded-pill border border-[#333]">
                          {village.region}
                        </span>
                      </div>
                      <div className="text-xl font-bold" style={{ color: cwsColor(village.cws) }}>
                        {village.cws}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {villageBookings.map(b => (
                        <div key={b.id} className="text-sm text-text-2 flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-pill bg-[#222] text-text-3 capitalize">
                            {getExperience(b.experienceId)?.type || 'exp'}
                          </span>
                          {b.experienceName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="w-full md:w-[350px] h-[300px] rounded-card overflow-hidden border border-[#222] shrink-0">
              <VillageMap visited={villagesVisited} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
