'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './lib/store';

const SUGGESTIONS = [
  'Rural Tuscany, Italy',
  'Oaxaca highlands, Mexico',
  'Cappadocia, Turkey',
  'Transylvania, Romania',
  'Rhodope Mountains, Bulgaria',
  'Kerala backwaters, India',
  'Faroe Islands',
  'Atlas Mountains, Morocco',
  'Patagonia, Argentina',
  'Yunnan province, China',
];

export default function LandingPage() {
  const router = useRouter();
  const { seedLocation, seedStatus, destination } = useApp();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.length > 1
    ? SUGGESTIONS.filter(s => s.toLowerCase().includes(input.toLowerCase()))
    : SUGGESTIONS;

  const handleSubmit = async (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    setInput(trimmed);
    setShowSuggestions(false);
    await seedLocation(trimmed);
    router.push('/onboarding');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit(input);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between px-6 py-12 md:px-12"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="border border-accent text-accent text-xs font-medium px-4 py-1.5 rounded-pill mb-8"
        >
          HackTUES 12 · Code to Care
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-5xl md:text-7xl leading-[1.1] mb-6"
        >
          <span className="text-white">Travel with</span><br />
          <span className="text-accent">purpose.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-text-2 text-lg md:text-xl max-w-xl mb-10"
        >
          Discover authentic off-the-path villages anywhere in the world, matched to your behavioral personality. Not algorithms. Not ratings. Real human connection.
        </motion.p>

        {/* Destination input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-lg relative"
        >
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={handleKey}
                placeholder="Where in the world? e.g. Rural Tuscany"
                className="w-full bg-surface border border-[#333] text-white placeholder-text-3 rounded-pill px-5 py-3.5 text-sm focus:outline-none focus:border-accent transition-colors"
              />

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && filtered.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-surface border border-[#333] rounded-card overflow-hidden z-50 shadow-xl"
                  >
                    {filtered.slice(0, 6).map(s => (
                      <button
                        key={s}
                        onMouseDown={() => handleSubmit(s)}
                        className="w-full text-left px-5 py-3 text-sm text-text-2 hover:bg-surface-2 hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => handleSubmit(input)}
              disabled={seedStatus === 'loading' || !input.trim()}
              className="bg-accent text-black font-semibold px-6 py-3.5 rounded-pill hover:bg-accent-dim active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {seedStatus === 'loading' ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Loading…
                </span>
              ) : 'Explore →'}
            </button>
          </div>

          {seedStatus === 'loading' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-text-3 text-xs mt-3"
            >
              Discovering villages in {input} with Gemini…
            </motion.p>
          )}
          {seedStatus === 'error' && (
            <p className="text-red-400 text-xs mt-3">Could not load destination. Check your API key or try again.</p>
          )}
          {seedStatus === 'done' && destination && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-accent text-xs mt-3"
            >
              ✓ {destination} loaded — continuing to personality test
            </motion.p>
          )}

          <p className="text-text-3 text-xs mt-3">Takes 3 minutes · No account needed · Works anywhere in the world</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 pb-16 md:pb-0"
      >
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all">
          <div className="text-white font-medium text-lg mb-1">Any destination</div>
          <div className="text-text-2 text-sm">Villages worldwide, generated live</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all">
          <div className="text-white font-medium text-lg mb-1">Real traveler data</div>
          <div className="text-text-2 text-sm">Reddit posts · Gemini structured</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all">
          <div className="text-white font-medium text-lg mb-1">5 personalities</div>
          <div className="text-text-2 text-sm">Which one are you?</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
