'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function SankeyDiagram({ 
  amount, split 
}: { 
  amount: number, split: { host: number, community: number, culture: number, platform: number } 
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setMounted(true);
  }, []);

  const width = 600;
  const height = 200;
  const leftX = 50;
  const rightX = 450;
  
  const total = amount;
  const hostH = (split.host / total) * height;
  const commH = (split.community / total) * height;
  const cultH = (split.culture / total) * height;
  const platH = (split.platform / total) * height;

  const paths = [
    { y1: height/2, y2: hostH/2, h: hostH, color: '#C8F55A', label: `Host €${split.host.toFixed(0)}` },
    { y1: height/2, y2: hostH + commH/2, h: commH, color: '#F5A623', label: `Community €${split.community.toFixed(0)}` },
    { y1: height/2, y2: hostH + commH + cultH/2, h: cultH, color: '#60A5FA', label: `Culture €${split.culture.toFixed(0)}` },
    { y1: height/2, y2: hostH + commH + cultH + platH/2, h: platH, color: '#888888', label: `Platform €${split.platform.toFixed(0)}` }
  ];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        {/* Left Node */}
        <rect x={leftX - 10} y={0} width={20} height={height} fill="#F5A623" rx={4} />
        <text x={leftX - 20} y={height/2} fill="white" fontSize="12" textAnchor="end" alignmentBaseline="middle">
          Your booking €{amount.toFixed(0)}
        </text>

        {/* Paths */}
        {paths.map((p, i) => {
          const cx = (leftX + rightX) / 2;
          const pathD = `M ${leftX + 10} ${p.y1} C ${cx} ${p.y1}, ${cx} ${p.y2}, ${rightX - 10} ${p.y2}`;
          
          return (
            <g key={i}>
              <motion.path 
                d={pathD} 
                fill="none" 
                stroke={p.color} 
                strokeWidth={Math.max(2, p.h * 0.8)} 
                strokeOpacity={0.6}
                initial={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                animate={mounted ? { strokeDashoffset: 0 } : {}}
                transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.1 }}
              />
              <rect x={rightX - 10} y={p.y2 - p.h/2} width={20} height={p.h} fill={p.color} rx={2} />
              <text x={rightX + 20} y={p.y2} fill="white" fontSize="12" alignmentBaseline="middle">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
