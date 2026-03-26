'use client'

import { useMotionValue, useTransform, motion, animate } from 'framer-motion'
import { useState } from 'react'

interface SwipeCardProps {
  children: React.ReactNode
  onChoice: (direction: 'left' | 'right') => void
}

export default function SwipeCard({ children, onChoice }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-15, 15])
  const leftOpacity = useTransform(x, [-150, -50, 0], [1, 0, 0])
  const rightOpacity = useTransform(x, [0, 50, 150], [0, 0, 1])
  const [gone, setGone] = useState(false)

  function fly(dir: 'left' | 'right') {
    if (gone) return
    setGone(true)
    animate(x, dir === 'right' ? 500 : -500, { duration: 0.3 }).then(() => onChoice(dir))
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 80) fly('right')
    else if (info.offset.x < -80) fly('left')
    else animate(x, 0, { type: 'spring', stiffness: 300 })
  }

  if (gone) return null

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        style={{ x, rotate }}
        drag="x"
        dragElastic={1}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative w-[min(88vw,24rem)] cursor-grab select-none rounded-3xl border border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50 p-7 shadow-[0_25px_60px_rgba(2,44,34,0.35)] touch-none active:cursor-grabbing"
      >
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute left-4 top-4 -rotate-12 rounded border-2 border-rose-500 px-3 py-1 text-xs font-bold tracking-wide text-rose-600"
        >
          SKIP
        </motion.div>
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute right-4 top-4 rotate-12 rounded border-2 border-emerald-500 px-3 py-1 text-xs font-bold tracking-wide text-emerald-600"
        >
          ADD
        </motion.div>
        {children}
      </motion.div>

      <div className="mt-1 flex gap-5">
        <button
          onClick={() => fly('left')}
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-rose-400/90 text-2xl font-bold text-rose-300 transition hover:bg-rose-400/10"
          aria-label="Skip"
        >
          ✕
        </button>
        <button
          onClick={() => fly('right')}
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-emerald-400 text-2xl font-bold text-emerald-200 transition hover:bg-emerald-400/10"
          aria-label="Include"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
