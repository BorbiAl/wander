'use client'

import { motion } from 'framer-motion'

const STATES = ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian']
const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 80
const LEVELS = 4

// Pentagon: 5 axes, 0° at top, going clockwise
function axisPoint(i: number, r: number): [number, number] {
  const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const [x, y] = axisPoint(i, v * RADIUS)
      return `${x},${y}`
    })
    .join(' ')
}

type Props = {
  /** 5-element array 0..1, one per state */
  values: number[]
  /** optional: dominant type label */
  dominant?: string
}

export default function PersonalityRadar({ values, dominant }: Props) {
  const safe = values.length === 5 ? values : [0.2, 0.2, 0.2, 0.2, 0.2]

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={SIZE} height={SIZE} className="overflow-visible">
        {/* Background grid rings */}
        {Array.from({ length: LEVELS }, (_, l) => {
          const r = (RADIUS * (l + 1)) / LEVELS
          const pts = Array.from({ length: 5 }, (_, i) => axisPoint(i, r).join(',')).join(' ')
          return (
            <polygon
              key={l}
              points={pts}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const [x, y] = axisPoint(i, RADIUS)
          return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />
        })}

        {/* Data polygon */}
        <motion.polygon
          points={polygonPoints(safe.map(() => 0))}
          fill="rgba(0,0,0,0.12)"
          stroke="black"
          strokeWidth={2}
          animate={{ points: polygonPoints(safe) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Axis labels */}
        {STATES.map((label, i) => {
          const [x, y] = axisPoint(i, RADIUS + 18)
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-slate-600"
              fontSize={11}
            >
              {label}
            </text>
          )
        })}

        {/* Value dots */}
        {safe.map((v, i) => {
          const [x, y] = axisPoint(i, v * RADIUS)
          return <circle key={i} cx={x} cy={y} r={3} fill="black" />
        })}
      </svg>

      {/* Percentage labels */}
      <div className="flex flex-wrap justify-center gap-2">
        {STATES.map((label, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full border ${
              dominant === label.toLowerCase()
                ? 'bg-black text-white border-black'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {label} {Math.round(safe[i] * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
}
