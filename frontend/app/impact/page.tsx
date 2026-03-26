'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/app/lib/store';
import { CWSCounter } from '@/components/CWSCounter';
import { ImpactFeed } from '@/components/ImpactFeed';
import { getVillage, getExperience } from '@/app/lib/utils';
import { VILLAGES } from '@/app/lib/data';
import { useImpactStream } from '@/hooks/useImpactStream';

const SankeyDiagram = dynamic(() => import('@/components/SankeyDiagram').then(m => ({ default: m.SankeyDiagram })), { ssr: false });
const Leaderboard = dynamic(() => import('@/components/Leaderboard').then(m => ({ default: m.Leaderboard })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });

export default function ImpactPage() {
  const router = useRouter();
  const { bookings, totalImpact, villagesVisited, points } = useApp();
  const { impacts: liveImpacts, connected: wsConnected } = useImpactStream();

  // Chart data
  const chartData = useMemo(() => {
    return [...bookings].reverse().reduce((acc, b, i) => {
      const prevImpact = i > 0 ? acc[i - 1].impact : 0;
      acc.push({ name: `Booking ${i+1}`, impact: prevImpact + b.amount });
      return acc;
    }, [] as { name: string, impact: number }[]);
  }, [bookings]);

  if (bookings.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}
        className="min-h-screen bg-[#E5E9DF] flex flex-col items-center justify-center px-6 text-center font-sans"
      >
        <div className="mb-6 text-7xl drop-shadow-sm">🌍</div>
        <h2 className="mb-3 text-4xl font-bold tracking-tight text-[#1A2E1C]">No impact yet</h2>
        <p className="text-[#1A2E1C]/60 mb-10 max-w-sm text-lg font-medium">Book an experience to start seeing your direct village impact right here.</p>
        <button 
          onClick={() => router.push('/discover')}
          className="rounded-full bg-[#0B6E2A] px-8 py-3.5 text-[15px] font-semibold tracking-wide text-white transition-all hover:bg-[#095A22] hover:scale-105 hover:shadow-lg active:scale-95"
        >
          Discover Experiences
        </button>
      </motion.div>
    );
  }

  const latestBooking = bookings[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20"
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20 lg:px-10">
        
        {/* Header */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-[40px] sm:text-[56px] leading-[1.1] font-bold tracking-[-0.04em] text-[#1A2E1C]">
              Impact
            </h1>
            <p className="text-[#1A2E1C]/60 text-lg sm:text-xl font-medium tracking-tight mt-1">
              Your contributions to the community.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/40 backdrop-blur-md border border-white/40 px-4 py-2 shadow-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-[#0B6E2A] animate-pulse shadow-[0_0_8px_rgba(11,110,42,0.6)]' : 'bg-[#1A2E1C]/30'}`} />
            <span className="text-[12px] font-semibold uppercase tracking-widest text-[#1A2E1C]/70">
              {wsConnected ? 'Live Network' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {[
            { label: "Total Spent", value: `€${totalImpact.toFixed(0)}`, color: "text-[#F5A623]" },
            { label: "Villages Helped", value: villagesVisited.length, color: "text-[#0B6E2A]" },
            { label: "Points Earned", value: Number(points) || 0, color: "text-[#1A2E1C]" },
            { label: "Bookings Made", value: bookings.length, color: "text-[#1A2E1C]" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col justify-end p-6 rounded-[28px] bg-white/60 backdrop-blur-md border border-white/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] transition-transform hover:scale-[1.02]">
              <div className="text-[12px] font-semibold uppercase tracking-widest text-[#1A2E1C]/50 mb-2">
                {stat.label}
              </div>
              <div className={`text-4xl sm:text-5xl font-bold tracking-tighter ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Live Bookings Feed (if active) */}
        {liveImpacts.length > 0 && (
          <div className="mb-12 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#0B6E2A]">
              <span className="h-2 w-2 rounded-full bg-[#0B6E2A] animate-pulse" />
              Global Activity
            </div>
            <div className="flex max-h-[140px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {liveImpacts.map((evt) => (
                <div key={evt.booking_id} className="flex items-center justify-between rounded-2xl bg-white/60 px-5 py-3.5 shadow-sm border border-white/50">
                  <span className="font-semibold text-[#1A2E1C]/80 tracking-tight">{evt.village_id}</span>
                  <span className="font-bold text-[#0B6E2A] bg-[#0B6E2A]/10 px-3 py-1 rounded-full text-sm">
                    +{evt.cws_delta} CWS · €{evt.amount_eur}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sankey Flow */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C] mb-6 pl-2">Booking Flow</h2>
          <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-8 sm:p-10">
            <SankeyDiagram amount={latestBooking.amount} split={latestBooking.split ?? { host: latestBooking.amount * 0.70, community: latestBooking.amount * 0.15, culture: latestBooking.amount * 0.10, platform: latestBooking.amount * 0.05 }} />
            <p className="text-[#1A2E1C]/50 mt-8 text-center text-[15px] font-medium tracking-tight">
              <span className="font-semibold text-[#1A2E1C]/80">{latestBooking.hostName || 'The host'}</span> in <span className="font-semibold text-[#1A2E1C]/80">{latestBooking.villageName}</span> received <span className="text-[#0B6E2A] font-bold">€{(latestBooking.split?.host ?? latestBooking.amount * 0.70).toFixed(0)}</span> directly from your booking.
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* CWS Impact */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C] mb-6 pl-2">CWS Impact</h2>
            <div className="flex flex-col gap-4">
              {Array.from(new Set(bookings.map(b => b.villageName))).map(vName => {
                const villageBookings = bookings.filter(b => b.villageName === vName);
                const totalDelta = villageBookings.reduce((sum, b) => sum + (Number(b.cwsDelta) || 0), 0);
                const village = VILLAGES.find(v => v.name === vName);
                return (
                  <CWSCounter
                    key={vName}
                    villageName={vName}
                    region={village?.region ?? ''}
                    before={Number(village?.cws) || 40}
                    delta={totalDelta}
                  />
                );
              })}
            </div>
          </div>

          {/* Over Time Chart */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#1A2E1C] mb-6 pl-2">Impact Over Time</h2>
            <div className="h-[300px] sm:h-[350px] rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-6 sm:p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                  <Tooltip 
                    cursor={{ stroke: '#0B6E2A', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(26,46,28,0.1)', borderRadius: '16px', color: '#1A2E1C', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: '600' }}
                    itemStyle={{ color: '#0B6E2A', fontWeight: 'bold' }}
                    formatter={(value) => [`€${value}`, 'Combined Impact']}
                  />
                  <Line type="monotone" dataKey="impact" stroke="#0B6E2A" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 8, fill: '#0B6E2A', stroke: '#fff', strokeWidth: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-6 sm:p-8">
            <ImpactFeed bookings={bookings} totalImpact={totalImpact} />
          </div>
          <div className="rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-6 sm:p-8">
            <Leaderboard />
          </div>
        </div>

      </div>
    </motion.div>
  );
}
