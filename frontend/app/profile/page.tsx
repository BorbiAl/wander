'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/lib/store';
import { PersonalityRadar } from '@/components/PersonalityRadar';
import { BadgeGrid } from '@/components/BadgeGrid';
import { AuthModal } from '@/components/AuthModal';
import { PERSONALITIES, PERSONALITY_INFO, VILLAGES } from '@/app/lib/data';
import { getExperience, cwsColor } from '@/app/lib/utils';
import { buildShareUrl } from '@/app/lib/friendUtils';
import { CloudOff } from 'lucide-react';
import { EventBeforeAfter } from '@/components/EventBeforeAfter';

const VillageMap = dynamic(() => import('@/components/VillageMap'), { ssr: false });

export default function ProfilePage() {
  const router = useRouter();
  const { userId, personality, badges, bookings, totalImpact, villagesVisited, email, loginWithEmail } = useApp();
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [userEventsBefore, setUserEventsBefore] = useState<string[] | null>(null);
  const [userEventsAfter, setUserEventsAfter] = useState<string[] | null>(null);

  useEffect(() => {
    if (!email || !userId) {
      setUserEventsBefore(null);
      setUserEventsAfter(null);
      return;
    }

    let mounted = true;
    fetch(`/api/auth?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setUserEventsBefore(Array.isArray(data.eventsBefore) ? data.eventsBefore : []);
        setUserEventsAfter(Array.isArray(data.eventsAfter) ? data.eventsAfter : []);
      })
      .catch(() => {
        if (!mounted) return;
        setUserEventsBefore(null);
        setUserEventsAfter(null);
      });

    return () => {
      mounted = false;
    };
  }, [email, userId]);

  const fallbackEventsBefore = useMemo(
    () => bookings.flatMap((b) => (Array.isArray(b.eventsBefore) ? b.eventsBefore : [])),
    [bookings],
  );
  const fallbackEventsAfter = useMemo(
    () => bookings.flatMap((b) => (Array.isArray(b.eventsAfter) ? b.eventsAfter : [])),
    [bookings],
  );

  const displayEventsBefore = userEventsBefore ?? fallbackEventsBefore;
  const displayEventsAfter = userEventsAfter ?? fallbackEventsAfter;

  function handleShare() {
    if (!personality) return;
    const url = buildShareUrl(userId, personality.vector, personality.dominant, `Traveler #${userId.slice(-4)}`);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => router.push('/friends?share=1'));
  }

  if (!personality) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-[#1A2E1C]/60 mb-6 font-medium">Complete your personality profile first.</p>
        <button onClick={() => window.location.href = '/onboarding'} className="rounded-full bg-[#0B6E2A] px-8 py-3 text-[15px] font-semibold tracking-wide text-white transition-all hover:bg-[#095A22] hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(11,110,42,0.2)]">Start Onboarding</button>
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
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20"
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20 lg:px-10 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-10 items-center md:items-start mb-16 bg-white/40 backdrop-blur-md rounded-[40px] p-8 sm:p-12 border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex-1 text-center md:text-left flex flex-col justify-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/40 mb-3">Traveler #{userId}</div>
          <h1 className="mb-4 text-5xl sm:text-6xl md:text-[72px] leading-[1.1] font-bold tracking-[-0.04em]" style={{ color: domColor }}>
            {personality.dominant}
          </h1>
          <p className="text-[#1A2E1C]/60 mx-auto max-w-md text-lg sm:text-xl font-medium tracking-tight italic md:mx-0 leading-relaxed">
            &quot;{domDesc}&quot;
          </p>
          <div className="flex gap-4 mt-8 justify-center md:justify-start flex-wrap">
            <button
              onClick={handleShare}
              className="bg-[#0B6E2A] text-white text-[14px] font-semibold tracking-wide px-6 py-3 rounded-full hover:bg-[#095A22] transition-all shadow-md hover:shadow-lg active:scale-95 shadow-[#0B6E2A]/20"
            >
              {copied ? 'Link copied!' : 'Share my profile'}
            </button>
            <button
              onClick={() => router.push('/friends')}
              className="bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[14px] font-semibold tracking-wide px-6 py-3 rounded-full hover:bg-white transition-all shadow-sm active:scale-95"
            >
              Manage companions →
            </button>
            {!email && (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[14px] font-semibold tracking-wide px-6 py-3 rounded-full hover:bg-white transition-all shadow-sm active:scale-95"
              >
                <CloudOff className="w-4 h-4 text-[#1A2E1C]/40" />
                Save to account
              </button>
            )}
          </div>
          {showAuth && (
            <AuthModal
              onClose={() => setShowAuth(false)}
              onSuccess={({ email: e, userId: uid, state }) => {
                loginWithEmail(e, uid, state);
                setShowAuth(false);
              }}
            />
          )}
        </div>
        <div className="h-[280px] w-[280px] shrink-0 drop-shadow-xl flex items-center justify-center">
          <PersonalityRadar vector={personality.vector} size={280} />
        </div>
      </div>

      {/* Personality Breakdown */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm mb-12 rounded-[32px] p-8 sm:p-10">
        <h2 className="mb-8 text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C]">Behavioral Profile</h2>
        <div className="flex flex-col gap-5">
          {PERSONALITIES.map((p, i) => {
            const val = personality.vector[i];
            const info = PERSONALITY_INFO[p];
            const isDom = i === personality.dominantIndex;
            
            return (
              <div key={p} className={`flex items-center gap-5 transition-all ${isDom ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-[20px] -mx-4 px-4 py-3 scale-[1.02]' : ''}`}>
                <div className="flex w-32 items-center gap-3 text-[14px] font-bold tracking-tight" style={{ color: isDom ? '#1A2E1C' : 'rgba(26, 46, 28, 0.5)' }}>
                  <span className="text-[20px]">{info.emoji}</span> {p}
                </div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#E5E9DF] shadow-inner">
                  <motion.div 
                    className="h-full rounded-full" 
                    style={{ backgroundColor: info.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                  />
                </div>
                <div className="w-14 text-right text-[15px] font-bold tracking-tighter" style={{ color: info.color }}>
                  {Math.round(val * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6 pl-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C]">Your Badges</h2>
          <span className="bg-white/60 backdrop-blur-md border border-white/50 text-[#1A2E1C]/60 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest shadow-sm">
            {badges.length} earned
          </span>
        </div>
        <BadgeGrid earnedBadges={badges} />
      </div>

      {/* Stats */}
      <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm flex flex-col items-center justify-center rounded-[28px] p-8 transition-transform hover:scale-[1.02]">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/50 mb-2">Total experiences</span>
          <span className="font-bold tracking-tighter text-5xl text-[#1A2E1C]">{bookings.length}</span>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm flex flex-col items-center justify-center rounded-[28px] p-8 transition-transform hover:scale-[1.02]">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/50 mb-2">Regions explored</span>
          <span className="font-bold tracking-tighter text-5xl text-[#0B6E2A]">{uniqueRegions}</span>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm flex flex-col items-center justify-center rounded-[28px] p-8 transition-transform hover:scale-[1.02]">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/50 mb-2">Total spent</span>
          <span className="text-[#F5A623] font-bold tracking-tighter text-5xl">€{totalImpact.toFixed(0)}</span>
        </div>
      </div>

      <div className="mb-12">
        <EventBeforeAfter
          title="Your events: before vs after"
          before={displayEventsBefore}
          after={displayEventsAfter}
        />
      </div>

      {/* Visit History */}
      {villagesVisited.length > 0 && (
        <div>
          <h2 className="mb-6 pl-2 text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C]">Villages visited</h2>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1 flex flex-col gap-4">
              {villagesVisited.map(vName => {
                const village = VILLAGES.find(v => v.name === vName);
                if (!village) return null;
                const villageBookings = bookings.filter(b => b.villageName === vName);
                
                return (
                  <div key={vName} className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[28px] p-7 transition-all hover:bg-white/80">
                    <div className="flex justify-between items-start mb-5 pb-5 border-b border-[#D6DCCD]/40">
                      <div>
                        <h3 className="mb-1.5 text-[22px] font-bold tracking-tight text-[#1A2E1C]">{village.name}</h3>
                        <span className="text-[#1A2E1C]/50 bg-[#E5E9DF]/50 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                          {village.region}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold tracking-tighter" style={{ color: cwsColor(village.cws) }}>
                          {village.cws}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#1A2E1C]/30 mt-0.5">CWS</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {villageBookings.map(b => (
                        <div key={b.id} className="text-[#1A2E1C]/70 flex items-center gap-3 text-[14px] font-medium tracking-tight">
                          <span className="rounded-full bg-white border border-[#D6DCCD]/60 px-3 py-1 shadow-sm text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/60">
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
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm h-[260px] w-full shrink-0 overflow-hidden rounded-[32px] sm:h-[400px] md:w-[400px] sticky top-28">
              <VillageMap visited={villagesVisited} />
            </div>
          </div>
        </div>
      )}
      </div>
    </motion.div>
  );
}
