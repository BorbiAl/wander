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
        className="relative cursor-grab active:cursor-grabbing rounded-2xl bg-white shadow-xl p-6 w-72 select-none touch-none"
      >
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute top-4 left-4 rounded border-2 border-red-500 px-2 py-1 text-red-500 font-bold text-sm -rotate-12"
        >
          NOPE
        </motion.div>
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute top-4 right-4 rounded border-2 border-green-500 px-2 py-1 text-green-500 font-bold text-sm rotate-12"
        >
          YES
        </motion.div>
        {children}
      </motion.div>

      {/* Button fallback so it always works */}
      <div className="flex gap-6">
        <button
          onClick={() => fly('left')}
          className="w-12 h-12 rounded-full border-2 border-red-400 text-red-400 text-xl font-bold hover:bg-red-50 transition-colors"
        >
          ✕
        </button>
        <button
          onClick={() => fly('right')}
          className="w-12 h-12 rounded-full border-2 border-green-500 text-green-500 text-xl font-bold hover:bg-green-50 transition-colors"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
