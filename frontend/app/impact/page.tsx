'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/lib/store';
import { SankeyDiagram } from '@/components/SankeyDiagram';
import { CWSCounter } from '@/components/CWSCounter';
import { ImpactFeed } from '@/components/ImpactFeed';
import { getVillage, getExperience } from '@/app/lib/utils';
import { VILLAGES } from '@/app/lib/data';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ImpactPage() {
  const router = useRouter();
  const { bookings, totalImpact, villagesVisited, points } = useApp();

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
        className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center px-4"
      >
        <div className="text-6xl mb-6">🌍</div>
        <h2 className="font-display text-3xl text-white mb-2">No impact yet</h2>
        <p className="text-text-2 mb-8 max-w-md">Book an experience to see your village impact here</p>
        <button 
          onClick={() => router.push('/discover')}
          className="bg-accent text-black font-medium px-8 py-3 rounded-pill hover:bg-accent-dim transition-colors"
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
      className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-24"
    >
      <div className="mb-10">
        <h1 className="font-display text-4xl text-white mb-2">Impact Dashboard</h1>
        <p className="text-text-2">Every booking you make strengthens a village community</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface border border-[#222] rounded-card p-5">
          <div className="font-display text-3xl text-amber mb-1">€{totalImpact.toFixed(0)}</div>
          <div className="font-sans text-[13px] text-text-2">Total Spent</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5">
          <div className="font-display text-3xl text-accent mb-1">{villagesVisited.length}</div>
          <div className="font-sans text-[13px] text-text-2">Villages Helped</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5">
          <div className="font-display text-3xl text-white mb-1">{points}</div>
          <div className="font-sans text-[13px] text-text-2">Points Earned</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5">
          <div className="font-display text-3xl text-text-2 mb-1">{bookings.length}</div>
          <div className="font-sans text-[13px] text-text-2">Bookings Made</div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="font-display text-2xl text-white mb-6">Latest Booking Flow</h2>
        <div className="bg-surface border border-[#222] rounded-card p-6 overflow-hidden">
          <SankeyDiagram amount={latestBooking.amount} split={latestBooking.split} />
          <p className="text-center text-text-2 text-sm mt-4 italic">
            {latestBooking.hostName || 'The host'} in {latestBooking.villageName} received €{latestBooking.split.host.toFixed(0)} from your booking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="font-display text-2xl text-white mb-6">CWS Impact</h2>
          {Array.from(new Set(bookings.map(b => b.villageName))).map(vName => {
            const villageBookings = bookings.filter(b => b.villageName === vName);
            const totalDelta = villageBookings.reduce((sum, b) => sum + b.cwsDelta, 0);
            const village = VILLAGES.find(v => v.name === vName);
            if (!village) return null;
            return (
              <CWSCounter 
                key={vName} 
                villageName={vName} 
                region={village.region} 
                before={village.cws} 
                delta={totalDelta} 
              />
            );
          })}
        </div>
        <div>
          <h2 className="font-display text-2xl text-white mb-6">Your impact over time</h2>
          <div className="bg-surface border border-[#222] rounded-card p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#C8F55A' }}
                  formatter={(value) => [`€${value}`, 'Impact']}
                />
                <Line type="monotone" dataKey="impact" stroke="#C8F55A" strokeWidth={3} dot={{ r: 4, fill: '#C8F55A' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ImpactFeed bookings={bookings} totalImpact={totalImpact} />
    </motion.div>
  );
}
