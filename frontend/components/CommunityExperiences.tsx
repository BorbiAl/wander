'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CommunityExperience } from '@/app/api/community/route';

const TYPE_EMOJI: Record<string, string> = {
  craft: '🪵', hike: '🥾', homestay: '🏡', ceremony: '🔥',
  cooking: '🍲', volunteer: '🌱', folklore: '🎵', sightseeing: '👁️',
};

function CommunityCard({ exp, index }: { exp: CommunityExperience; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-surface border border-[#222] rounded-card p-4 hover:border-[#333] transition-colors cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_EMOJI[exp.type] ?? '✨'}</span>
          <span className="font-display text-white text-base leading-tight">{exp.title}</span>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {exp.price_eur === 0
            ? <span className="text-accent text-xs font-bold">Free</span>
            : <span className="text-amber text-sm font-medium">€{exp.price_eur}</span>
          }
          <span className={`text-text-3 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-2 border border-[#333] text-text-3 capitalize">
          {exp.type}
        </span>
        {exp.subreddit && (
          <span className="text-[10px] text-text-3">r/{exp.subreddit}</span>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-text-2 text-sm leading-relaxed mb-3">{exp.description}</p>

            {exp.host_hint && (
              <p className="text-text-3 text-xs italic mb-3">Hosted by {exp.host_hint}</p>
            )}

            {/* Personality fit bar */}
            <div className="flex gap-1 mb-3">
              {['E','C','R','A','G'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(exp.personality_weights[i] ?? 0) * 100}%`, opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[9px] text-text-3">{label}</span>
                </div>
              ))}
            </div>

            {exp.source_url && (
              <a
                href={exp.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] text-text-3 hover:text-accent underline transition-colors"
              >
                Source post →
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CommunityExperiences({ villageName }: { villageName: string }) {
  const [experiences, setExperiences] = useState<CommunityExperience[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [redditCount, setRedditCount] = useState(0);
  const lastVillage = useRef('');

  useEffect(() => {
    if (!villageName || villageName === lastVillage.current) return;
    lastVillage.current = villageName;

    setStatus('loading');
    setExperiences([]);

    fetch(`/api/community?village=${encodeURIComponent(villageName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('error'); return; }
        setExperiences(data.experiences ?? []);
        setRedditCount(data.reddit_posts_found ?? 0);
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }, [villageName]);

  if (status === 'idle') return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-display text-lg text-white">From the community</h3>
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-text-3 text-xs">
            <div className="w-3 h-3 border-2 border-[#333] border-t-accent rounded-full animate-spin" />
            Searching Reddit + Gemini…
          </div>
        )}
        {status === 'done' && (
          <span className="text-[10px] text-text-3 bg-surface-2 border border-[#333] px-2 py-0.5 rounded-pill">
            {redditCount} Reddit posts · Gemini extracted
          </span>
        )}
        {status === 'error' && (
          <span className="text-[10px] text-red-400">Could not load community data</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {experiences.map((exp, i) => (
          <CommunityCard key={i} exp={exp} index={i} />
        ))}
      </div>

      {status === 'done' && experiences.length === 0 && (
        <p className="text-text-3 text-sm italic">No community experiences found for this village yet.</p>
      )}
    </div>
  );
}
