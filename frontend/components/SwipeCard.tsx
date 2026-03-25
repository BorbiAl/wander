'use client'

import { useMotionValue, useTransform, motion } from 'framer-motion'

interface SwipeCardProps {
  children: React.ReactNode
  onChoice: (direction: 'left' | 'right') => void
}

export default function SwipeCard({ children, onChoice }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-15, 15])
  const leftOpacity = useTransform(x, [-150, -50, 0], [1, 0, 0])
  const rightOpacity = useTransform(x, [0, 50, 150], [0, 0, 1])

  function handleDragEnd() {
    if (x.get() > 100) onChoice('right')
    else if (x.get() < -100) onChoice('left')
  }

  return (
    <div className="relative">
      <motion.div
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative cursor-grab active:cursor-grabbing rounded-2xl bg-white shadow-xl p-6 w-72 select-none"
      >
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute top-4 left-4 rounded border-2 border-red-500 px-2 py-1 text-red-500 font-bold text-sm rotate-[-20deg]"
        >
          NOPE
        </motion.div>
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute top-4 right-4 rounded border-2 border-green-500 px-2 py-1 text-green-500 font-bold text-sm rotate-[20deg]"
        >
          YES
        </motion.div>
        {children}
      </motion.div>
    </div>
  )
}
