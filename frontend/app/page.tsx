"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Monospaced font for numbers
const mono = "font-mono";

// Mock data for villages and experiences
const VILLAGES = [
  {
    id: "shiroka_laka",
    name: "Shiroka Laka",
    region: "Rhodopes",
    cws: 42,
    description: "A village famous for its bagpipe school and traditional Rhodope architecture.",
    hosts: [
      { name: "Dimitar", bio: "Master bagpipe maker, 3rd generation." }
    ],
    experiences: [
      { title: "Bagpipe Workshop", desc: "Learn to play the gaida with a master." }
    ]
  },
  // ...add more villages as needed
];

// --- 1. Global Loader ---
function Loader({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="border-2 border-emerald-900/50 rounded-lg p-8 bg-stone-950 flex flex-col items-center"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <span className="text-emerald-400 text-lg mb-4 tracking-widest font-semibold">
              Calculating Your Journey...
            </span>
            <motion.div
              className="w-48 h-4 bg-stone-900 border border-emerald-900/50 rounded overflow-hidden relative"
            >
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400/80 to-emerald-900/80"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 1.2,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- 2. Real Globe (SVG Mock) ---
function RealGlobe() {
  return (
    <div className="flex justify-center items-center py-12">
      <svg width={320} height={320} viewBox="0 0 320 320" className="drop-shadow-[0_0_40px_#34d39999]">
        <defs>
          <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#14532d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
          </radialGradient>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="atop" />
          </filter>
        </defs>
        <circle
          cx="160"
          cy="160"
          r="140"
          fill="url(#globeGlow)"
          filter="url(#innerGlow)"
          stroke="#34d399"
          strokeWidth="2"
        />
        {/* Mock continents */}
        <ellipse cx="120" cy="160" rx="60" ry="90" fill="#166534" fillOpacity="0.7" />
        <ellipse cx="200" cy="120" rx="40" ry="60" fill="#22c55e" fillOpacity="0.5" />
        <ellipse cx="180" cy="200" rx="30" ry="40" fill="#059669" fillOpacity="0.4" />
        {/* Subtle grid lines */}
        {[...Array(8)].map((_, i) => (
          <ellipse
            key={i}
            cx="160"
            cy="160"
            rx={140 - i * 15}
            ry={140 - i * 15}
            fill="none"
            stroke="#34d39922"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}

// --- 3. Discover Section ---
function VillageCard({ village, onOpen }: { village: any; onOpen: (id: string) => void }) {
  return (
    <div className="bg-stone-900 border border-emerald-900/50 rounded-xl p-6 mb-6 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-emerald-400 text-xl font-bold">{village.name}</span>
        <button
          className="px-4 py-1 rounded bg-emerald-950 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition"
          onClick={() => onOpen(village.id)}
        >
          Open
        </button>
      </div>
      <div className="text-stone-300">{village.region}</div>
      <div className="text-stone-400">{village.description}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-amber-400 font-bold text-lg drop-shadow-glow">{village.cws}</span>
        <span className={`text-xs ${mono} text-emerald-400`}>CWS Score</span>
      </div>
    </div>
  );
}

function VillagePanel({ village, onClose }: { village: any; onClose: () => void }) {
  return (
    <AnimatePresence>
      {village && (
        <motion.div
          className="fixed inset-0 z-40 bg-stone-950/90 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-stone-900 border border-emerald-900/50 rounded-2xl p-8 w-full max-w-xl shadow-2xl relative"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <button
              className="absolute top-4 right-4 text-emerald-400 hover:text-amber-400"
              onClick={onClose}
            >
              ✕
            </button>
            <h2 className="text-emerald-400 text-2xl font-bold mb-2">{village.name}</h2>
            <div className="text-stone-400 mb-4">{village.description}</div>
            <div className="mb-4">
              <div className="text-emerald-400 font-semibold mb-1">Hosts</div>
              {village.hosts.map((host: any, i: number) => (
                <div key={i} className="text-stone-300">{host.name}: <span className="text-stone-400">{host.bio}</span></div>
              ))}
            </div>
            <div>
              <div className="text-emerald-400 font-semibold mb-1">Experiences</div>
              {village.experiences.map((exp: any, i: number) => (
                <div key={i} className="mb-2">
                  <span className="text-amber-400 font-bold">{exp.title}</span>
                  <div className="text-stone-400">{exp.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- 4. Onboarding Section ---
function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([0, 0, 0]);
  // Example questions
  const questions = [
    { q: "How adventurous are you?", min: "Not at all", max: "Very" },
    { q: "Do you prefer nature or culture?", min: "Nature", max: "Culture" },
    { q: "Solo or group travel?", min: "Solo", max: "Group" }
  ];
  return (
    <div className="w-full max-w-lg mx-auto mt-12">
      <h1 className="text-emerald-400 text-3xl font-bold mb-8 text-center">Personalize Your Journey</h1>
      <div className="flex flex-col gap-10">
        {questions.map((q, i) => (
          <motion.div
            key={i}
            className="bg-stone-900 border border-emerald-900/50 rounded-xl p-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="text-emerald-400 font-semibold mb-2">{q.q}</div>
            <div className="flex items-center gap-4">
              <span className="text-stone-400 text-xs">{q.min}</span>
              <input
                type="range"
                min={0}
                max={10}
                value={answers[i]}
                onChange={e => {
                  const v = Number(e.target.value);
                  setAnswers(a => a.map((x, idx) => (idx === i ? v : x)));
                }}
                className="w-full accent-emerald-400"
              />
              <span className="text-stone-400 text-xs">{q.max}</span>
              <span className={`ml-2 ${mono} text-emerald-400`}>{answers[i]}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <button
        className="mt-10 w-full py-3 rounded bg-emerald-950 border border-emerald-900/50 text-emerald-400 font-bold text-lg hover:bg-emerald-900 transition"
        onClick={onComplete}
      >
        Start Exploring
      </button>
    </div>
  );
}

// --- 5. Impact Section ---
function ImpactSection() {
  const [cws, setCws] = useState(22);
  const [dots, setDots] = useState(Array(45).fill(false));
  const [animating, setAnimating] = useState(false);

  // Animate CWS upward and dots on booking
  const simulateBooking = () => {
    setAnimating(true);
    // Animate CWS
    let target = cws + Math.floor(Math.random() * 5 + 1);
    let i = cws;
    const cwsInterval = setInterval(() => {
      i++;
      setCws(i);
      if (i >= target) clearInterval(cwsInterval);
    }, 40);

    // Animate dots
    let newDots = [...dots];
    let indices: number[] = [];
    while (indices.length < 5) {
      let idx = Math.floor(Math.random() * 45);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.forEach((idx, j) => {
      setTimeout(() => {
        newDots[idx] = true;
        setDots([...newDots]);
        if (j === indices.length - 1) setAnimating(false);
      }, 200 + j * 120);
    });
  };

  // Organic dot cluster positions
  const dotPositions = [
    [0, 0], [20, 10], [40, -10], [60, 20], [80, 0], [100, 15], [120, -5], [140, 10], [160, 0],
    [10, 30], [30, 25], [50, 40], [70, 30], [90, 35], [110, 25], [130, 40], [150, 30],
    [20, 60], [40, 55], [60, 70], [80, 60], [100, 65], [120, 55], [140, 70],
    [30, 90], [50, 85], [70, 100], [90, 90], [110, 95], [130, 85],
    [40, 120], [60, 115], [80, 130], [100, 120], [120, 125], [140, 115],
    [50, 150], [70, 145], [90, 160], [110, 150], [130, 155],
    [60, 180], [80, 170], [100, 180], [120, 170], [140, 180]
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mt-16 mb-24 flex flex-col items-center">
      <h2 className="text-emerald-400 text-2xl font-bold mb-4">CWS Health Meter</h2>
      <motion.div
        className="w-64 h-24 bg-stone-900 border border-emerald-900/50 rounded-xl flex items-center justify-center mb-8"
        initial={{ scale: 0.95 }}
        animate={{ scale: animating ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
      >
        <span className={`text-amber-400 text-5xl drop-shadow-glow ${mono}`}>{cws}</span>
      </motion.div>
      <div className="relative w-[220px] h-[200px]">
        {dotPositions.map(([x, y], i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full w-4 h-4 ${dots[i] ? "bg-amber-400 drop-shadow-[0_0_8px_#fbbf24]" : "bg-emerald-900"} border border-emerald-900/50`}
            style={{ left: x, top: y }}
            animate={dots[i] ? { scale: [1, 1.4, 1], boxShadow: "0 0 16px #fbbf24" } : { scale: 1, boxShadow: "none" }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          />
        ))}
      </div>
      <button
        className="mt-8 px-8 py-3 rounded bg-emerald-950 border border-emerald-900/50 text-emerald-400 font-bold text-lg hover:bg-emerald-900 transition"
        onClick={simulateBooking}
        disabled={animating}
      >
        Simulate Booking
      </button>
    </div>
  );
}

// --- Main SPA Layout ---
export default function Page() {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);

  // Simulate loading after onboarding
  useEffect(() => {
    if (onboardingDone) {
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    }
  }, [onboardingDone]);

  const selectedVillageObj = VILLAGES.find(v => v.id === selectedVillage);

  return (
    <div className="min-h-screen bg-stone-950 text-emerald-400 font-sans">
      <Loader show={loading} />
      {!onboardingDone && !loading && (
        <Onboarding onComplete={() => setOnboardingDone(true)} />
      )}
      {onboardingDone && !loading && (
        <div>
          {/* Globe */}
          <RealGlobe />
          {/* Discover Section */}
          <div className="w-full max-w-2xl mx-auto px-4">
            <h2 className="text-emerald-400 text-2xl font-bold mb-6">Discover Villages</h2>
            {VILLAGES.map(v => (
              <VillageCard key={v.id} village={v} onOpen={setSelectedVillage} />
            ))}
          </div>
          {/* Village Side Panel */}
          <VillagePanel
            village={selectedVillageObj}
            onClose={() => setSelectedVillage(null)}
          />
          {/* Impact Section */}
          <ImpactSection />
        </div>
      )}
    </div>
  );
}