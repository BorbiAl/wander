'use client';

import { Booking } from '@/app/lib/store';

export function ImpactFeed({ bookings, totalImpact }: { bookings: Booking[], totalImpact: number }) {
  return (
    <div className="bg-surface border border-[#222] rounded-card p-5">
      <div className="text-text-3 uppercase text-[11px] mb-4">Your bookings</div>
      <div className="flex flex-col gap-4">
        {bookings.map((b, i) => (
          <div key={b.id} className={`flex justify-between items-center pb-4 ${i !== bookings.length - 1 ? 'border-b border-[#222]' : ''}`}>
            <div>
              <div className="text-white text-sm font-medium">{b.experienceName}</div>
              <div className="text-text-2 text-xs">{b.villageName}</div>
            </div>
            <div className="text-right">
              <div className="text-amber font-medium text-sm">€{b.amount.toFixed(0)}</div>
              <div className="text-accent text-[10px] px-2 py-0.5 rounded-pill bg-accent/10 border border-accent/20 mt-1">
                +{b.cwsDelta} CWS
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-[#333] flex justify-between items-center font-display text-lg">
        <span className="text-text-2">Total impact:</span>
        <span className="text-amber font-bold">€{totalImpact.toFixed(0)}</span>
      </div>
    </div>
  );
}
