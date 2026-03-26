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
      <div className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted mb-4">Complete your personality profile first.</p>
        <button onClick={() => window.location.href = '/onboarding'} className="rounded-pill bg-[#0B6E2A] px-6 py-2 text-white">Start Onboarding</button>
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
      className="page-standard"
    >
      <div className="page-shell pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-16">
        <div className="flex-1 text-center md:text-left">
          <div className="text-muted mb-2 text-sm">Traveler #{userId}</div>
          <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl" style={{ color: domColor }}>
            {personality.dominant}
          </h1>
          <p className="text-muted mx-auto max-w-md text-lg italic md:mx-0">
            &quot;{domDesc}&quot;
          </p>
        </div>
        <div className="h-[min(280px,78vw)] w-[min(280px,78vw)] shrink-0 md:h-[280px] md:w-[280px]">
          <PersonalityRadar vector={personality.vector} size={260} />
        </div>
      </div>

      {/* Personality Breakdown */}
      <div className="surface-card mb-12 rounded-card p-6">
        <h2 className="mb-6 text-xl">Your Behavioral Profile</h2>
        <div className="flex flex-col gap-4">
          {PERSONALITIES.map((p, i) => {
            const val = personality.vector[i];
            const info = PERSONALITY_INFO[p];
            const isDom = i === personality.dominantIndex;
            
            return (
              <div key={p} className={`flex items-center gap-4 ${isDom ? 'surface-card -mx-2 rounded-lg border p-2' : ''}`}>
                <div className="flex w-28 items-center gap-2 text-sm" style={{ color: isDom ? '#1A2E1C' : 'rgba(26, 46, 28, 0.66)' }}>
                  <span>{info.emoji}</span> {p}
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#D6DCCD]">
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
          <h2 className="text-2xl">Your badges</h2>
          <span className="surface-card text-muted rounded-pill px-2 py-0.5 text-xs">
            {badges.length} earned
          </span>
        </div>
        <BadgeGrid earnedBadges={badges} />
      </div>

      {/* Stats */}
      <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="surface-card flex items-center justify-between rounded-card p-5">
          <span className="text-muted">Total experiences</span>
          <span className="font-display text-2xl">{bookings.length}</span>
        </div>
        <div className="surface-card flex items-center justify-between rounded-card p-5">
          <span className="text-muted">Regions explored</span>
          <span className="font-display text-2xl">{uniqueRegions}</span>
        </div>
        <div className="surface-card flex items-center justify-between rounded-card p-5">
          <span className="text-muted">Total spent</span>
          <span className="text-amber font-display text-2xl">€{totalImpact.toFixed(0)}</span>
        </div>
      </div>

      {/* Visit History */}
      {villagesVisited.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl">Villages visited</h2>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1 flex flex-col gap-4">
              {villagesVisited.map(vName => {
                const village = VILLAGES.find(v => v.name === vName);
                if (!village) return null;
                const villageBookings = bookings.filter(b => b.villageName === vName);
                
                return (
                  <div key={vName} className="surface-card rounded-card p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="mb-1 text-xl">{village.name}</h3>
                        <span className="text-muted rounded-pill border border-[#D6DCCD] bg-[#F4EDE2] px-2 py-0.5 text-[10px] uppercase">
                          {village.region}
                        </span>
                      </div>
                      <div className="text-xl font-bold" style={{ color: cwsColor(village.cws) }}>
                        {village.cws}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {villageBookings.map(b => (
                        <div key={b.id} className="text-muted flex items-center gap-2 text-sm">
                          <span className="rounded-pill bg-[#E2E7DA] px-2 py-0.5 text-[10px] capitalize text-[#1A2E1C]/70">
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
            <div className="surface-card h-[260px] w-full shrink-0 overflow-hidden rounded-card sm:h-[300px] md:w-[350px]">
              <VillageMap visited={villagesVisited} />
            </div>
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}
