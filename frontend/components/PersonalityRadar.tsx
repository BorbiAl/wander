'use client'

const AXES = ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian']
const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2
const R = 84

function angleAt(i: number) {
  return (-Math.PI / 2) + i * (2 * Math.PI / AXES.length)
}

function point(value: number, i: number) {
  const a = angleAt(i)
  return {
    x: CX + value * R * Math.cos(a),
    y: CY + value * R * Math.sin(a),
  }
}

interface Props {
  personality_vector: number[]
}

export default function PersonalityRadar({ personality_vector }: Props) {
  const gridLevels = [0.25, 0.5, 0.75, 1]

  const polygonPoints = personality_vector
    .map((v, i) => point(v, i))
    .map(p => `${p.x},${p.y}`)
    .join(' ')

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {gridLevels.map(level => {
        const pts = AXES.map((_, i) => point(level, i)).map(p => `${p.x},${p.y}`).join(' ')
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="#d1fae5"
            strokeWidth={1}
          />
        )
      })}

      {AXES.map((_, i) => {
        const p = point(1, i)
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={p.x} y2={p.y}
            stroke="#d1fae5"
            strokeWidth={1}
          />
        )
      })}

      <polygon
        points={polygonPoints}
        fill="rgba(16,185,129,0.3)"
        stroke="#10b981"
        strokeWidth={2}
      />

      {AXES.map((label, i) => {
        const p = point(1.38, i)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#064e3b"
            fontWeight="600"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
