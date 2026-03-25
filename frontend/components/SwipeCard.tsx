'use client'

import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export type SwipeChoice = 'left' | 'right' | 'skip'

type Props = {
  leftImage: string
  rightImage: string
  leftLabel?: string
  rightLabel?: string
  /** emission index emitted on left-swipe */
  leftEmission: number
  /** emission index emitted on right-swipe */
  rightEmission: number
  onChoice: (emission: number, choice: SwipeChoice) => void
}

export default function SwipeCard({
  leftImage,
  rightImage,
  leftLabel,
  rightLabel,
  leftEmission,
  rightEmission,
  onChoice,
}: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-18, 18])
  const leftOpacity = useTransform(x, [-220, 0], [1, 0.25])
  const rightOpacity = useTransform(x, [0, 220], [0.25, 1])
  const cardOpacity = useTransform(x, [-300, -220, 0, 220, 300], [0, 1, 1, 1, 0])

  const [gone, setGone] = useState(false)

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      setGone(true)
      onChoice(rightEmission, 'right')
    } else if (info.offset.x < -100) {
      setGone(true)
      onChoice(leftEmission, 'left')
    }
  }

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          key="card"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, rotate, opacity: cardOpacity }}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="relative w-80 h-96 rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none"
        >
          <div className="grid grid-cols-2 h-full">
            <motion.div
              className="relative overflow-hidden"
              style={{ opacity: leftOpacity }}
            >
              <img
                src={leftImage}
                alt={leftLabel ?? 'Option A'}
                className="w-full h-full object-cover pointer-events-none"
              />
              {leftLabel && (
                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {leftLabel}
                </span>
              )}
            </motion.div>

            <motion.div
              className="relative overflow-hidden"
              style={{ opacity: rightOpacity }}
            >
              <img
                src={rightImage}
                alt={rightLabel ?? 'Option B'}
                className="w-full h-full object-cover pointer-events-none"
              />
              {rightLabel && (
                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {rightLabel}
                </span>
              )}
            </motion.div>
          </div>

          {/* drag hint arrows */}
          <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
            <motion.span
              className="text-white text-2xl font-bold drop-shadow"
              style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
            >
              ←
            </motion.span>
            <motion.span
              className="text-white text-2xl font-bold drop-shadow"
              style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
            >
              →
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
