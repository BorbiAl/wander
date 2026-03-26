'use client';

import { motion } from 'motion/react';
import { PERSONALITIES, PERSONALITY_INFO } from '@/app/lib/data';

export function PersonalityRadar({ 
  vector, size = 280 
}: { 
  vector: [number, number, number, number, number], size?: number 
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.7; // Leave room for labels

  // Compute points for the polygon
  const points = PERSONALITIES.map((_, i) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const r = vector[i] * radius * 2; // scale up to fill radar
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  const pointsString = points.map(p => p.join(',')).join(' ');
  const centerPointsString = PERSONALITIES.map(() => `${cx},${cy}`).join(' ');

  // Dominant color
  const dominantIndex = vector.indexOf(Math.max(...vector));
  const dominantColor = PERSONALITY_INFO[PERSONALITIES[dominantIndex]].color;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <circle 
            key={i} cx={cx} cy={cy} r={radius * scale} 
            fill="none" stroke="#333" strokeWidth="1" 
          />
        ))}

        {/* Axes */}
        {PERSONALITIES.map((_, i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          return (
            <line 
              key={i} x1={cx} y1={cy} x2={x2} y2={y2} 
              stroke="#333" strokeWidth="1" 
            />
          );
        })}

        {/* Polygon */}
        <motion.polygon
          initial={{ points: centerPointsString }}
          animate={{ points: pointsString }}
          transition={{ duration: 1, ease: "easeOut" }}
          fill={`${dominantColor}4D`} // 30% opacity
          stroke={dominantColor}
          strokeWidth="2"
        />
      </svg>

      {/* Labels */}
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
  );
}
