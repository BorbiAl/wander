'use client';

import { Booking } from '@/app/lib/store';

export function ImpactFeed({ bookings, totalImpact }: { bookings: Booking[], totalImpact: number }) {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1A2E1C]/50 mb-6">Recent Bookings</div>
      <div className="flex flex-col gap-4 flex-1">
        {bookings.map((b, i) => (
          <div key={b.id} className={`flex justify-between items-center pb-4 ${i !== bookings.length - 1 ? 'border-b border-[#D6DCCD]/60' : ''}`}>
            <div>
              <div className="text-[#1A2E1C] text-sm font-semibold tracking-tight">{b.experienceName}</div>
              <div className="text-[#1A2E1C]/60 text-xs mt-0.5 font-medium">{b.villageName}</div>
            </div>
            <div className="text-right">
              <div className="text-[#F5A623] font-semibold text-sm">€{b.amount.toFixed(0)}</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#0B6E2A]/10 text-[#0B6E2A] font-bold text-[10px] tracking-wide mt-1 shadow-sm">
                +{b.cwsDelta} CWS
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[#D6DCCD] flex justify-between items-end">
        <span className="text-[#1A2E1C]/60 font-medium text-sm">Total impact</span>
        <span className="text-[#0B6E2A] font-bold text-2xl tracking-tight">€{totalImpact.toFixed(0)}</span>
      </div>
    </div>
  );
}
