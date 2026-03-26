'use client';

export function BadgeGrid({ earnedBadges }: { earnedBadges: string[] }) {
  const allBadges = [
    { id: 'Pioneer', emoji: '🗺️', desc: 'Booked a village with CWS below 45', color: '#F5A623' },
    { id: 'Trailblazer', emoji: '🧭', desc: 'Visited 3 different regions', color: '#0B6E2A' },
    { id: 'Guardian', emoji: '♻️', desc: 'Completed a volunteer experience', color: '#22C55E' },
    { id: 'Connector', emoji: '🤝', desc: 'Booked 2+ social experiences', color: '#60A5FA' },
    { id: 'Achiever', emoji: '⛰️', desc: 'Completed a hiking experience', color: '#F87171' },
  ];

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
      {allBadges.map(b => {
        const earned = earnedBadges.includes(b.id);
        
        return (
          <div 
            key={b.id} 
            className={`shrink-0 w-[100px] h-[120px] rounded-[20px] border flex flex-col items-center justify-center p-3 relative group transition-all duration-300 ${earned ? 'border-[#D6DCCD] bg-white/80 backdrop-blur-md shadow-sm hover:-translate-y-1 hover:shadow-md' : 'border-[#D6DCCD]/40 bg-[#E5E9DF]/30 opacity-50 grayscale'}`}
            style={earned ? { boxShadow: `0 8px 24px ${b.color}15` } : {}}
          >
            <div className="text-[38px] mb-2.5 drop-shadow-sm">{earned ? b.emoji : '❔'}</div>
            <div className={`text-[11px] font-bold tracking-widest uppercase text-center ${earned ? 'text-[#1A2E1C]' : 'text-[#1A2E1C]/40'}`}>
              {earned ? b.id : 'Locked'}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-36 bg-white/90 backdrop-blur-xl border border-[#D6DCCD] shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-[#1A2E1C]/80 font-medium text-[11px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-10 text-center translate-y-1 group-hover:translate-y-0">
              {b.desc}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-spacing-3 border-4 border-transparent border-t-white/90" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
