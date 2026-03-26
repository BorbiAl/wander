"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './lib/store';
import MarketingGlobe, { type DestinationNode } from '../components/MarketingGlobe';
import { MapPin, ChevronDown, Play, Dices, Globe2, X } from 'lucide-react';
import Link from 'next/link';

type ApiVillage = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
};

const MAIN_CITY_BY_COUNTRY: Record<string, { city: string; lat: number; lng: number }> = {
  Bulgaria: { city: 'Sofia', lat: 42.6977, lng: 23.3219 },
  Romania: { city: 'Bucharest', lat: 44.4268, lng: 26.1025 },
  Albania: { city: 'Tirana', lat: 41.3275, lng: 19.8187 },
  'Bosnia and Herzegovina': { city: 'Sarajevo', lat: 43.8563, lng: 18.4131 },
  'North Macedonia': { city: 'Skopje', lat: 41.9981, lng: 21.4254 },
  Serbia: { city: 'Belgrade', lat: 44.7866, lng: 20.4489 },
  Montenegro: { city: 'Podgorica', lat: 42.4304, lng: 19.2594 },
  Moldova: { city: 'Chisinau', lat: 47.0105, lng: 28.8638 },
  Ukraine: { city: 'Kyiv', lat: 50.4501, lng: 30.5234 },
  Georgia: { city: 'Tbilisi', lat: 41.7151, lng: 44.8271 },
  Turkey: { city: 'Ankara', lat: 39.9334, lng: 32.8597 },
  Lebanon: { city: 'Beirut', lat: 33.8938, lng: 35.5018 },
  Jordan: { city: 'Amman', lat: 31.9454, lng: 35.9284 },
  Nepal: { city: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  Bhutan: { city: 'Thimphu', lat: 27.4728, lng: 89.639 },
  Myanmar: { city: 'Naypyidaw', lat: 19.7633, lng: 96.0785 },
  Laos: { city: 'Vientiane', lat: 17.9757, lng: 102.6331 },
  Vietnam: { city: 'Hanoi', lat: 21.0278, lng: 105.8342 },
  Morocco: { city: 'Rabat', lat: 34.0209, lng: -6.8416 },
  Tunisia: { city: 'Tunis', lat: 36.8065, lng: 10.1815 },
  Ethiopia: { city: 'Addis Ababa', lat: 8.9806, lng: 38.7578 },
  Tanzania: { city: 'Dodoma', lat: -6.163, lng: 35.7516 },
  Senegal: { city: 'Dakar', lat: 14.7167, lng: -17.4677 },
  Mali: { city: 'Bamako', lat: 12.6392, lng: -8.0029 },
  Peru: { city: 'Lima', lat: -12.0464, lng: -77.0428 },
  Bolivia: { city: 'La Paz', lat: -16.4897, lng: -68.1193 },
  Ecuador: { city: 'Quito', lat: -0.1807, lng: -78.4678 },
  Colombia: { city: 'Bogota', lat: 4.711, lng: -74.0721 },
  Paraguay: { city: 'Asuncion', lat: -25.2637, lng: -57.5759 },
  Guatemala: { city: 'Guatemala City', lat: 14.6349, lng: -90.5069 },
  Mexico: { city: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  Canada: { city: 'Ottawa', lat: 45.4215, lng: -75.6972 },
  Fiji: { city: 'Suva', lat: -18.1248, lng: 178.4501 },
  'Papua New Guinea': { city: 'Port Moresby', lat: -9.4438, lng: 147.1803 },
};

function buildCityHubNodes(villageCounts?: Map<string, number>): DestinationNode[] {
  return Object.entries(MAIN_CITY_BY_COUNTRY)
    .map(([country, hub]) => ({
      name: `${hub.city}, ${country}`,
      city: hub.city,
      country,
      lat: hub.lat,
      lng: hub.lng,
      villages: villageCounts?.get(country) ?? 0,
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

export default function LandingPage() {
  const router = useRouter();
  const { seedLocation, seedStatus } = useApp();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [destinations, setDestinations] = useState<DestinationNode[]>(buildCityHubNodes());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    async function loadDestinations() {
      try {
        const res = await fetch('/api/villages');
        if (!res.ok) return;
        const villages: ApiVillage[] = await res.json();
        if (!Array.isArray(villages) || villages.length === 0) return;

        const byCountry = new Map<string, number>();
        for (const v of villages) {
          const country = (v.country?.trim() || 'Bulgaria');
          byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
        }

        const nodes = buildCityHubNodes(byCountry);

        if (nodes.length > 0) setDestinations(nodes);
      } catch {
        // Keep default destinations
        setDestinations(buildCityHubNodes());
      }
    }

    loadDestinations();
  }, []);

  const filtered = input.length > 1
    ? destinations.filter(s => s.name.toLowerCase().includes(input.toLowerCase()))
    : destinations;

  const handleSubmit = async (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    setInput(trimmed);
    setShowSuggestions(false);
    seedLocation(trimmed);
    router.push('/onboarding');
  };

  const handleLucky = () => {
    const randomDest = destinations[Math.floor(Math.random() * destinations.length)]?.name;
    if (!randomDest) return;
    handleSubmit(randomDest);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit(input);
  };

  if (!mounted) return null;

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
          {/* Badge */}
          <div className="inline-block bg-[#F4E3D7] text-[#C84A31] text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
            Redefining Discovery
          </div>

          {/* Headline */}
          <h1 className="font-display text-6xl lg:text-7xl leading-[1.1] tracking-tight mb-6 text-[#1A2E1C]">
            The world is a<br /> map of <span className="text-[#0B6E2A] italic">your<br />character.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#1A2E1C]/70 text-lg leading-relaxed mb-10 max-w-lg">
            WanderGraph uses behavioral AI to match your unique travel personality with authentic hidden villages. Start your digital ledger by exploring the globe.
          </p>

          {/* Search Bar Action */}
          <div className="relative mb-6">
            <div className="flex items-center bg-white rounded-full p-2 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 relative z-20">
              <div className="pl-4 pr-3 text-black/40">
                <Globe2 className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKey}
                placeholder="Choose a destination..."
                className="flex-1 bg-transparent text-black placeholder-black/40 py-3 text-sm focus:outline-none min-w-0"
              />
              <div className="px-3 text-black/40 border-r border-black/10 mr-3">
                <ChevronDown className="w-4 h-4" />
              </div>
              <button
                onClick={() => handleSubmit(input)}
                disabled={seedStatus === 'loading' || !input.trim()}
                className="bg-[#0B6E2A] text-white font-semibold px-6 py-3 text-sm rounded-full hover:bg-[#095A22] active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {seedStatus === 'loading' ? 'Locating...' : 'Find My Match'}
              </button>
            </div>

            {/* Suggestions Overlay */}
            <AnimatePresence>
              {showSuggestions && filtered.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-2xl overflow-hidden z-10 shadow-xl"
                >
                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                    {filtered.slice(0, 8).map(s => (
                      <button
                        key={s.name}
                        onMouseDown={() => handleSubmit(s.name)}
                        className="w-full flex items-center gap-3 text-left px-4 py-3 text-sm text-black/70 hover:bg-black/5 hover:text-black rounded-xl transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-black/30" />
                        {s.city}, {s.country}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLucky}
              disabled={seedStatus === 'loading'}
              className="bg-[#F4E3D7] text-[#C84A31] font-semibold text-sm px-6 py-3 rounded-full hover:bg-[#F0D5C4] transition-colors flex items-center gap-2"
            >
              <Dices className="w-4 h-4" />
              I'm Feeling Lucky
            </button>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-black/60 font-medium text-sm px-6 py-3 rounded-full hover:bg-black/5 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[#E5E9DF] flex items-center justify-center text-[#0B6E2A]">
                <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
              </div>
              See How It Works
            </button>
          </div>

          {/* Status Text */}
          <AnimatePresence>
            {(seedStatus === 'loading' || seedStatus === 'error' || seedStatus === 'done') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                {seedStatus === 'loading' && <p className="text-[#0B6E2A] text-sm font-medium flex items-center gap-2"><span className="w-3 h-3 border-2 border-[#0B6E2A] border-t-transparent rounded-full animate-spin" /> Fetching geographic demographic data...</p>}
                {seedStatus === 'error' && <p className="text-red-500 text-sm font-medium">Analysis failed. Invalid region or LLM error.</p>}
                {seedStatus === 'done' && <p className="text-[#0B6E2A] text-sm font-medium">✓ Region structured. Preparing onboarding...</p>}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </main>

      {/* How It Works Modal */}
      <AnimatePresence>
        {showHowItWorks && (
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
              <button
                type="button"
                aria-label="Close how it works dialog"
                title="Close"
                onClick={() => setShowHowItWorks(false)}
                className="absolute top-5 right-5 text-black/30 hover:text-black/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="font-display text-3xl text-[#1A2E1C] mb-2">How It Works</h2>
              <p className="text-[#1A2E1C]/60 text-sm mb-8">Four steps to your perfect off-the-beaten-path trip.</p>

              <div className="flex flex-col gap-6">
                {[
                  {
                    step: '01',
                    title: 'Pick a destination',
                    desc: 'Search for any region in the world. Our AI fetches real rural villages and local experiences specific to that area.',
                    color: '#0B6E2A',
                  },
                  {
                    step: '02',
                    title: 'Build your personality profile',
                    desc: 'Answer 15 behavioral questions — swipe choices, audio scenarios, emoji picks. A Hidden Markov Model maps your responses to a 5-dimension travel personality.',
                    color: '#C84A31',
                  },
                  {
                    step: '03',
                    title: 'Get matched to experiences',
                    desc: 'Our graph engine scores every village experience against your personality vector. The closer the match, the higher it ranks.',
                    color: '#F5A623',
                  },
                  {
                    step: '04',
                    title: 'Book & track your impact',
                    desc: '70% of your booking goes directly to the host, 15% to the community, 10% to cultural preservation. Watch the Community Wellbeing Signal rise in real time.',
                    color: '#60A5FA',
                  },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1A2E1C] mb-1">{item.title}</h3>
                      <p className="text-[#1A2E1C]/60 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setShowHowItWorks(false); router.push('/onboarding'); }}
                className="mt-8 w-full bg-[#0B6E2A] text-white font-semibold py-3 rounded-full hover:bg-[#095A22] transition-colors"
              >
                Start your journey →
              </button>
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