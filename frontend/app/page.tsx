'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './lib/store';
import MarketingGlobe, { DEFAULT_DESTINATIONS, type DestinationNode } from '../components/MarketingGlobe';
import { MapPin, ChevronDown, Play, Dices, Globe2, X } from 'lucide-react';
import Link from 'next/link';

type ApiVillage = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
};

export default function LandingPage() {
  const router = useRouter();
  const { seedLocation, seedStatus } = useApp();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [destinations, setDestinations] = useState<DestinationNode[]>(DEFAULT_DESTINATIONS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    async function loadDestinations() {
      try {
        const res = await fetch('/api/villages');
        if (!res.ok) return;
        const villages: ApiVillage[] = await res.json();
        if (!Array.isArray(villages) || villages.length === 0) return;

        const byCountry = new Map<string, { latSum: number; lngSum: number; count: number }>();
        for (const v of villages) {
          if (typeof v.lat !== 'number' || typeof v.lng !== 'number') continue;
          const country = (v.country?.trim() || 'Bulgaria');
          const bucket = byCountry.get(country) ?? { latSum: 0, lngSum: 0, count: 0 };
          bucket.latSum += v.lat;
          bucket.lngSum += v.lng;
          bucket.count += 1;
          byCountry.set(country, bucket);
        }

        const nodes: DestinationNode[] = Array.from(byCountry.entries())
          .map(([country, agg]) => ({
            name: country,
            country,
            lat: agg.latSum / agg.count,
            lng: agg.lngSum / agg.count,
            villages: agg.count,
          }))
          .sort((a, b) => b.villages - a.villages);

        if (nodes.length > 0) setDestinations(nodes);
      } catch {
        // Keep default destinations
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

  return (
    <div className="relative min-h-screen bg-[#F5F5EC] text-[#1A2E1C] overflow-hidden font-sans selection:bg-[#1A5328] selection:text-white flex flex-col">
      
      {/* 3D Global Map Background / Right Side */}
      <div className="absolute inset-0 lg:left-[45%] z-0 pointer-events-none lg:pointer-events-auto flex items-center justify-center translate-x-1/4 lg:translate-x-0 opacity-40 lg:opacity-100">
        <MarketingGlobe destinations={destinations} onSelect={handleSubmit} />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 w-full px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <span className="font-display font-bold text-2xl text-[#0B4D21]">WanderGraph</span>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-widest uppercase text-black/60">
            <Link href="/" className="text-[#C84A31] border-b-2 border-[#C84A31] pb-1">Discover</Link>
            <Link href="/map" className="hover:text-black transition-colors pb-1 border-b-2 border-transparent">Map</Link>
            <Link href="/impact" className="hover:text-black transition-colors pb-1 border-b-2 border-transparent">Impact</Link>
            <Link href="/profile" className="hover:text-black transition-colors pb-1 border-b-2 border-transparent">Profile</Link>
          </div>
        </div>
        <button onClick={() => router.push('/onboarding')} className="bg-[#0B6E2A] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#095A22] transition-colors shadow-lg">
          Start Journey
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-8 lg:px-16 w-full lg:w-[55%]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl"
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
                        {s.name} ({s.villages})
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHowItWorks(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
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
        )}
      </AnimatePresence>
    </div>
  );
}
