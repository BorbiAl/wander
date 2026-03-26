'use client';

export function BadgeGrid({ earnedBadges }: { earnedBadges: string[] }) {
  const allBadges = [
    { id: 'Pioneer', emoji: '🗺️', desc: 'Booked a village with CWS below 45', color: '#F5A623' },
    { id: 'Trailblazer', emoji: '🧭', desc: 'Visited 3 different regions', color: '#C8F55A' },
    { id: 'Guardian', emoji: '♻️', desc: 'Completed a volunteer experience', color: '#22C55E' },
    { id: 'Connector', emoji: '🤝', desc: 'Booked 2+ social experiences', color: '#60A5FA' },
    { id: 'Achiever', emoji: '⛰️', desc: 'Completed a hiking experience', color: '#F87171' },
  ];

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
      {allBadges.map(b => {
        const earned = earnedBadges.includes(b.id);
        
        return (
          <div 
            key={b.id} 
            className={`shrink-0 w-[90px] h-[110px] rounded-card border flex flex-col items-center justify-center p-2 relative group transition-all ${earned ? 'border-[#333] bg-surface' : 'border-[#222] bg-surface-2 opacity-50 grayscale'}`}
            style={earned ? { boxShadow: `0 0 20px ${b.color}15` } : {}}
          >
            <div className="text-4xl mb-2">{earned ? b.emoji : '❔'}</div>
            <div className={`text-[10px] font-medium text-center ${earned ? 'text-white' : 'text-text-3'}`}>
              {earned ? b.id : 'Locked'}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-[#111] border border-[#333] text-text-2 text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
              {b.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}
