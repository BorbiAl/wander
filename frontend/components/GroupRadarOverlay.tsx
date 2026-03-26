'use client';

import { PERSONALITIES, PERSONALITY_INFO } from '@/app/lib/data';

type MemberEntry = {
  displayName: string;
  vector: [number, number, number, number, number];
  dominant: string;
};

export function GroupRadarOverlay({
  members,
  size = 260,
}: {
  members: MemberEntry[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.7;

  function polygonPoints(vector: [number, number, number, number, number]): string {
    return PERSONALITIES.map((_, i) => {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = vector[i] * radius * 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <circle key={i} cx={cx} cy={cy} r={radius * scale} fill="none" stroke="#333" strokeWidth="1" />
          ))}
          {/* Axes */}
          {PERSONALITIES.map((_, i) => {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={cx} y1={cy}
                x2={cx + radius * Math.cos(angle)}
                y2={cy + radius * Math.sin(angle)}
                stroke="#333" strokeWidth="1"
              />
            );
          })}
          {/* One polygon per member */}
          {members.map((member, mi) => {
            const color = PERSONALITY_INFO[member.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
            return (
              <polygon
                key={mi}
                points={polygonPoints(member.vector)}
                fill={`${color}26`}  // 15% opacity
                stroke={color}
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Axis labels */}
        {PERSONALITIES.map((p, i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const labelRadius = radius * 1.25;
          const x = cx + labelRadius * Math.cos(angle);
          const y = cy + labelRadius * Math.sin(angle);
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
              style={{ left: x, top: y }}
            >
              <span className="text-xl">{PERSONALITY_INFO[p].emoji}</span>
              <span className="text-[10px] text-text-2 mt-1">{p}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {members.map((member, mi) => {
          const color = PERSONALITY_INFO[member.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
          return (
            <div key={mi} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="text-xs text-text-2">{member.displayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
