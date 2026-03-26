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
    <div className="wg-shell w-full rounded-3xl p-6 sm:p-7 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-emerald-50">Sound Moodboard</h3>
        <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100">ambient cues</span>
      </div>
      <div className="space-y-2">
        {CLIPS.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => selectClip(i)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
              i === activeIndex
                ? 'border-emerald-300/70 bg-emerald-200/20'
                : 'border-emerald-400/20 bg-emerald-950/30 hover:bg-emerald-900/50'
            }`}
          >
            <p className="text-sm font-semibold text-emerald-50">{c.title}</p>
            <p className="text-xs text-emerald-100/70">{c.description}</p>
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
          className="w-full accent-emerald-300"
          aria-label="Playback position"
        />
        <div className="flex justify-between text-xs text-emerald-100/65">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className="w-full rounded-full bg-emerald-300 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-200"
      >
        {playing ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
