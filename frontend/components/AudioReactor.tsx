'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

type Props = {
  /** URL to the audio clip */
  src: string
  label: string
  /** emission index for slider value 1-2 (low comfort) */
  emissionLow: number
  /** emission index for slider value 3 (mid comfort) */
  emissionMid: number
  /** emission index for slider value 4-5 (high comfort) */
  emissionHigh: number
  onChoice: (emission: number, value: number) => void
}

export default function AudioReactor({
  src,
  label,
  emissionLow,
  emissionMid,
  emissionHigh,
  onChoice,
}: Props) {
  const [value, setValue] = useState(3)
  const [submitted, setSubmitted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toEmission = (v: number) => {
    if (v <= 2) return emissionLow
    if (v === 3) return emissionMid
    return emissionHigh
  }

  const handleSubmit = () => {
    if (submitted) return
    setSubmitted(true)
    audioRef.current?.pause()
    onChoice(toEmission(value), value)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const barWidth = `${((value - 1) / 4) * 100}%`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-white p-5 shadow-sm w-80"
    >
      <audio ref={audioRef} src={src} loop onEnded={() => setPlaying(false)} />

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">{label}</p>
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-lg"
        >
          {playing ? '⏸' : '▶'}
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-2">How comfortable does this sound feel?</p>

      <div className="relative mb-1">
        <div className="h-2 rounded bg-slate-200">
          <div className="h-2 rounded bg-black transition-all" style={{ width: barWidth }} />
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={submitted}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between text-xs text-slate-400 mb-4">
        <span>Uncomfortable</span>
        <span>{value}</span>
        <span>Very at home</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted}
        className="w-full rounded-lg bg-black text-white py-2 text-sm disabled:opacity-40"
      >
        {submitted ? 'Logged ✓' : 'Confirm'}
      </button>
    </motion.div>
  )
}
