'use client'

import { useRef, useState } from 'react'

const CLIPS = [
  {
    title: 'Village Morning',
    description: 'Ambient sounds from a quiet Bulgarian village at dawn.',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'Mountain Trail',
    description: 'Wind and birdsong along a Rhodope mountain path.',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Local Market',
    description: 'Lively chatter and folk music at a weekly market.',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
]

export default function AudioReactor() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  function selectClip(index: number) {
    setActiveIndex(index)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current
    if (!audio) return
    setDuration(audio.duration)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrentTime(Number(e.target.value))
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const clip = CLIPS[activeIndex]

  return (
    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
      <div className="space-y-2">
        {CLIPS.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => selectClip(i)}
            className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
              i === activeIndex
                ? 'bg-emerald-50 border border-emerald-400'
                : 'bg-gray-50 border border-transparent hover:bg-gray-100'
            }`}
          >
            <p className="font-semibold text-sm text-gray-900">{c.title}</p>
            <p className="text-xs text-gray-500">{c.description}</p>
          </button>
        ))}
      </div>

      <audio
        ref={audioRef}
        src={clip.src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSlider}
          className="w-full accent-emerald-500"
          aria-label="Playback position"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className="w-full rounded-full bg-emerald-500 py-3 text-white font-semibold hover:bg-emerald-400 transition-colors"
      >
        {playing ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
