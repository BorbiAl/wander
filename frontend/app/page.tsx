"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './lib/store';
import MarketingGlobe, { type DestinationNode } from '../components/MarketingGlobe';
import { MapPin, ChevronDown, Play, Dices, Globe2, X, Users } from 'lucide-react';

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

type CountryHubStats = {
  count: number;
  sampleCity: string;
  sampleLat: number;
  sampleLng: number;
};

function buildCityHubNodes(villageStats?: Map<string, CountryHubStats>): DestinationNode[] {
  if (villageStats && villageStats.size > 0) {
    return Array.from(villageStats.entries())
      .filter(([, stats]) => stats.count > 0)
      .map(([country, stats]) => {
        const hub = MAIN_CITY_BY_COUNTRY[country];
        if (hub) {
          return {
            name: `${hub.city}, ${country}`,
            city: hub.city,
            country,
            lat: hub.lat,
            lng: hub.lng,
            villages: stats.count,
          };
        }

        // Country exists in villages API but has no curated hub city in the static table yet.
        return {
          name: `${stats.sampleCity}, ${country}`,
          city: stats.sampleCity,
          country,
          lat: stats.sampleLat,
          lng: stats.sampleLng,
          villages: stats.count,
        };
      })
      .sort((a, b) => a.country.localeCompare(b.country));
  }

  return Object.entries(MAIN_CITY_BY_COUNTRY)
    .map(([country, hub]) => ({
      name: `${hub.city}, ${country}`,
      city: hub.city,
      country,
      lat: hub.lat,
      lng: hub.lng,
      villages: 0,
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

export default function LandingPage() {
  const router = useRouter();
  const { seedLocation, seedStatus, activeGroupId, personality } = useApp();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [destinations, setDestinations] = useState<DestinationNode[]>([]);
  const [activeGroup, setActiveGroupData] = useState<{ id: string; name: string; memberCount: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    async function loadDestinations() {
      try {
        const res = await fetch('/api/villages');
        if (!res.ok) {
          setDestinations([]);
          return;
        }
        const villages: ApiVillage[] = await res.json();
        if (!Array.isArray(villages) || villages.length === 0) {
          setDestinations([]);
          return;
        }

        const byCountry = new Map<string, CountryHubStats>();
        for (const v of villages) {
          const country = v.country?.trim() || 'Bulgaria';
          const prev = byCountry.get(country);
          if (!prev) {
            byCountry.set(country, {
              count: 1,
              sampleCity: v.name,
              sampleLat: v.lat,
              sampleLng: v.lng,
            });
          } else {
            prev.count += 1;
          }
        }

        const nodes = buildCityHubNodes(byCountry);
        if (nodes.length > 0) setDestinations(nodes);
        else setDestinations([]);
      } catch {
        setDestinations([]);
      }
    }

    loadDestinations();
  }, []);

  // Fetch active group info for the banner
  useEffect(() => {
    if (!activeGroupId) { setActiveGroupData(null); return; }
    fetch(`/api/groups/${activeGroupId}`)
      .then(r => r.ok ? r.json() : null)
      .then(g => {
        if (g) setActiveGroupData({ id: g.id, name: g.name, memberCount: g.members.length });
        else setActiveGroupData(null);
      })
      .catch(() => setActiveGroupData(null));
  }, [activeGroupId]);

  const filtered =
    input.length > 1
      ? destinations.filter((s) => s.name.toLowerCase().includes(input.toLowerCase()))
      : destinations;

  const handleSubmit = async (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    setInput(trimmed);
    setShowSuggestions(false);
    await seedLocation(trimmed);
    router.push('/onboarding');
  };

  const handleGroupSubmit = async (loc: string) => {
    if (!activeGroupId) return;
    const trimmed = loc.trim();
    if (!trimmed) return;
    setInput(trimmed);
    setShowSuggestions(false);
    // Update destination on the group backend + seed locally
    await fetch(`/api/groups/${activeGroupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: trimmed }),
    });
    await seedLocation(trimmed);
    router.push(`/group/${activeGroupId}`);
  };

  const handleLucky = () => {
    const randomDest = destinations[Math.floor(Math.random() * destinations.length)]?.name;
    if (!randomDest) return;
    void handleSubmit(randomDest);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSubmit(input);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#E5E9DF] px-6 py-8 lg:px-12">
        <section className="relative z-10 mx-auto grid min-h-[86vh] w-full max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-4">
          <div className="relative z-20 max-w-2xl">
            <div className="mb-8 inline-block rounded-full bg-[#F4E3D7] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C84A31]">
              Redefining Discovery
            </div>

            <h1 className="mb-6 font-display text-6xl leading-[1.1] tracking-tight text-[#1A2E1C] lg:text-7xl">
              The world is a
              <br />
              map of <span className="italic text-[#0B6E2A]">your character.</span>
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed text-[#1A2E1C]/70">
              WanderGraph uses behavioral AI to match your travel personality with hidden villages and authentic local hosts.
            </p>

            <div className="relative mb-6">
              <label htmlFor="destination-input" className="sr-only">
                Choose a destination
              </label>
              <div className="relative z-20 flex items-center rounded-full border border-black/5 bg-white p-2 pr-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="pl-4 pr-3 text-black/40">
                  <Globe2 className="h-5 w-5" />
                </div>
                <input
                  id="destination-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={handleKey}
                  placeholder="Choose a destination..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-black placeholder-black/40 focus:outline-none"
                />
                <div className="mr-3 border-r border-black/10 px-3 text-black/40">
                  <ChevronDown className="h-4 w-4" />
                </div>
                <button
                  onClick={() => void handleSubmit(input)}
                  disabled={seedStatus === 'loading' || !input.trim()}
                  className="whitespace-nowrap rounded-full bg-[#0B6E2A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#095A22] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {seedStatus === 'loading' ? 'Locating...' : 'Find My Match'}
                </button>
              </div>

              <AnimatePresence>
                {showSuggestions && filtered.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl"
                  >
                    <div className="max-h-60 overflow-y-auto p-2">
                      {filtered.map((s) => (
                        <button
                          key={s.name}
                          onMouseDown={() => void handleSubmit(s.name)}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black"
                        >
                          <MapPin className="h-4 w-4 text-black/30" />
                          {s.city}, {s.country}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active group banner */}
            <AnimatePresence>
              {activeGroup && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mb-4 flex items-center gap-3 rounded-2xl border border-[#0B6E2A]/30 bg-[#0B6E2A]/10 px-4 py-3"
                >
                  <Users className="h-4 w-4 text-[#0B6E2A] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#1A2E1C]">{activeGroup.name}</span>
                    <span className="text-xs text-[#1A2E1C]/60 ml-2">
                      {activeGroup.memberCount} член{activeGroup.memberCount !== 1 ? 'а' : ''}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-4">
              {activeGroup && personality && (
                <button
                  onClick={() => void handleGroupSubmit(input || destinations[Math.floor(Math.random() * destinations.length)]?.name || '')}
                  disabled={seedStatus === 'loading'}
                  className="flex items-center gap-2 rounded-full bg-[#0B6E2A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#095A22] disabled:opacity-50"
                >
                  <Users className="h-4 w-4" />
                  {seedStatus === 'loading' ? 'Зарежда…' : `Планирай с ${activeGroup.name}`}
                </button>
              )}
              <button
                onClick={handleLucky}
                disabled={seedStatus === 'loading'}
                className="flex items-center gap-2 rounded-full bg-[#F4E3D7] px-6 py-3 text-sm font-semibold text-[#C84A31] transition-colors hover:bg-[#F0D5C4]"
              >
                <Dices className="h-4 w-4" />
                I&apos;m Feeling Lucky
              </button>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium text-black/60 transition-colors hover:bg-black/5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E9DF] text-[#0B6E2A]">
                  <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
                </div>
                See How It Works
              </button>
            </div>

            <AnimatePresence>
              {(seedStatus === 'loading' || seedStatus === 'done') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  {seedStatus === 'loading' && (
                    <p className="flex items-center gap-2 text-sm font-medium text-[#0B6E2A]">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0B6E2A] border-t-transparent" />
                      Fetching geographic demographic data...
                    </p>
                  )}
                  {seedStatus === 'done' && (
                    <p className="text-sm font-medium text-[#0B6E2A]">Region structured. Preparing onboarding...</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 h-[400px] w-full lg:-mt-4 lg:flex lg:h-[680px] lg:items-center lg:justify-end lg:self-center">
            <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
              <div className="absolute right-[8%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(26,46,28,0.12)_0%,rgba(229,233,223,0)_72%)]" />
            </div>
            <MarketingGlobe
              destinations={destinations}
              onSelect={(location) => void handleSubmit(location)}
              inline
              allowOverflow
              className="lg:h-[660px] lg:w-[760px]"
            />
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                type="button"
                aria-label="Close how it works dialog"
                title="Close"
                onClick={() => setShowHowItWorks(false)}
                className="absolute right-5 top-5 text-black/30 transition-colors hover:text-black/60"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="mb-2 font-display text-3xl text-[#1A2E1C]">How It Works</h2>
              <p className="mb-8 text-sm text-[#1A2E1C]/60">Four steps to your perfect off-the-beaten-path trip.</p>

              <div className="flex flex-col gap-6">
                {[
                  {
                    step: '01',
                    title: 'Pick a destination',
                    desc: 'Search for any region. Our AI fetches real villages and local experiences specific to that area.',
                    color: '#0B6E2A',
                  },
                  {
                    step: '02',
                    title: 'Build your personality profile',
                    desc: 'Answer behavioral questions and we map your responses into a travel-personality signature.',
                    color: '#C84A31',
                  },
                  {
                    step: '03',
                    title: 'Get matched to experiences',
                    desc: 'Our graph engine scores each experience against your profile and ranks the best fit first.',
                    color: '#F5A623',
                  },
                  {
                    step: '04',
                    title: 'Book and track impact',
                    desc: 'A transparent split routes value to hosts, communities, and cultural preservation.',
                    color: '#60A5FA',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-[#1A2E1C]">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-[#1A2E1C]/60">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowHowItWorks(false);
                  router.push('/onboarding');
                }}
                className="mt-8 w-full rounded-full bg-[#0B6E2A] py-3 font-semibold text-white transition-colors hover:bg-[#095A22]"
              >
                Start your journey
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
