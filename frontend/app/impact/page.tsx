'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useApp } from '@/app/lib/store';
import { SankeyDiagram } from '@/components/SankeyDiagram';
import { CWSCounter } from '@/components/CWSCounter';
import { ImpactFeed } from '@/components/ImpactFeed';
import { getVillage, getExperience } from '@/app/lib/utils';
import { VILLAGES } from '@/app/lib/data';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useImpactStream } from '@/hooks/useImpactStream';
import { Leaderboard } from '@/components/Leaderboard';

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
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center"
      >
        <div className="text-6xl mb-6">🌍</div>
        <h2 className="mb-2 text-3xl">No impact yet</h2>
        <p className="text-muted mb-8 max-w-md">Book an experience to see your village impact here</p>
        <button 
          onClick={() => router.push('/discover')}
          className="rounded-pill bg-[#0B6E2A] px-8 py-3 font-medium text-white transition-colors hover:bg-[#095A22]"
        >
          Discover experiences →
        </button>
      </motion.div>
    );
  }

  const latestBooking = bookings[0];
  const latestVillage = getVillage(latestBooking.experienceId ? getExperience(latestBooking.experienceId)?.villageId || '' : '');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="page-standard"
    >
      <div className="page-shell pb-24">
      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:mb-10 sm:flex-row">
        <div>
          <h1 className="mb-2 text-3xl sm:text-4xl">Impact Dashboard</h1>
          <p className="text-muted">Every booking you make strengthens a village community</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-[#0B6E2A] animate-pulse' : 'bg-[#A5AB9D]'}`} />
          <span className="text-muted text-xs">{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {liveImpacts.length > 0 && (
        <div className="surface-card mb-8 rounded-card p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] uppercase text-[#0B6E2A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0B6E2A] animate-pulse" />
            Live global bookings
          </div>
          <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
            {liveImpacts.map((evt) => (
              <div key={evt.booking_id} className="flex justify-between text-sm">
                <span className="text-muted">{evt.village_id}</span>
                <span className="font-medium text-[#0B6E2A]">+{evt.cws_delta} CWS · €{evt.amount_eur}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div className="surface-card rounded-card p-5">
          <div className="font-display text-3xl text-amber mb-1">€{totalImpact.toFixed(0)}</div>
          <div className="text-muted font-sans text-[13px]">Total Spent</div>
        </div>
        <div className="surface-card rounded-card p-5">
          <div className="mb-1 font-display text-3xl text-[#0B6E2A]">{villagesVisited.length}</div>
          <div className="text-muted font-sans text-[13px]">Villages Helped</div>
        </div>
        <div className="surface-card rounded-card p-5">
          <div className="mb-1 font-display text-3xl">{Number(points) || 0}</div>
          <div className="text-muted font-sans text-[13px]">Points Earned</div>
        </div>
        <div className="surface-card rounded-card p-5">
          <div className="text-muted mb-1 font-display text-3xl">{bookings.length}</div>
          <div className="text-muted font-sans text-[13px]">Bookings Made</div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="mb-6 text-2xl">Latest Booking Flow</h2>
        <div className="surface-card overflow-hidden rounded-card p-6">
          <SankeyDiagram amount={latestBooking.amount} split={latestBooking.split ?? { host: latestBooking.amount * 0.70, community: latestBooking.amount * 0.15, culture: latestBooking.amount * 0.10, platform: latestBooking.amount * 0.05 }} />
          <p className="text-muted mt-4 text-center text-sm italic">
            {latestBooking.hostName || 'The host'} in {latestBooking.villageName} received €{(latestBooking.split?.host ?? latestBooking.amount * 0.70).toFixed(0)} from your booking
          </p>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <div>
          <h2 className="mb-6 text-2xl">CWS Impact</h2>
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
        <div>
          <h2 className="mb-6 text-2xl">Your impact over time</h2>
          <div className="surface-card h-[300px] rounded-card p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#F4EDE2', border: '1px solid #D6DCCD', borderRadius: '8px', color: '#1A2E1C' }}
                  itemStyle={{ color: '#0B6E2A' }}
                  formatter={(value) => [`€${value}`, 'Impact']}
                />
                <Line type="monotone" dataKey="impact" stroke="#0B6E2A" strokeWidth={3} dot={{ r: 4, fill: '#0B6E2A' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <ImpactFeed bookings={bookings} totalImpact={totalImpact} />
        <Leaderboard />
      </div>
      </div>
    </motion.div>
  );
}
