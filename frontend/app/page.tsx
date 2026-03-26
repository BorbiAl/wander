'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

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
          Discover authentic Bulgarian villages matched to your behavioral personality. Not algorithms. Not ratings. Real human connection.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <button 
            onClick={() => router.push('/onboarding')}
            className="bg-accent text-black font-semibold px-10 py-4 rounded-pill hover:bg-accent-dim active:scale-[0.97] transition-all text-lg"
          >
            Begin your journey →
          </button>
          <span className="text-text-3 text-xs">Takes 3 minutes · No account needed</span>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.4 }}
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 pb-16 md:pb-0"
      >
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all">
          <div className="text-white font-medium text-lg mb-1">25 villages</div>
          <div className="text-text-2 text-sm">Across 6 regions</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all">
          <div className="text-white font-medium text-lg mb-1">60 experiences</div>
          <div className="text-text-2 text-sm">Craft, hike, homestay</div>
        </div>
        <div className="bg-surface border border-[#222] rounded-card p-5 hover:border-[#333] transition-all flex justify-between items-end">
          <div>
            <div className="text-white font-medium text-lg mb-1">5 personalities</div>
            <div className="text-text-2 text-sm">Which one are you?</div>
          </div>
          <div className="text-text-3 text-xs">Built for Bulgaria 🇧🇬</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
