'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { GroupScoredExperience } from '@/app/lib/data';
import { computeGroupVector } from '@/app/lib/hmm';
import { GroupRadarOverlay } from '@/components/GroupRadarOverlay';
import { GroupExperienceCard } from '@/components/GroupExperienceCard';

type SortMode = 'group' | 'allSatisfied';

export default function GroupDiscoverPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { userId, personality, friends, groups, setActiveGroup } = useApp();

  const [results, setResults] = useState<GroupScoredExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('group');

  const group = groups.find(g => g.id === params.groupId);

  // Resolve members: combine local user + friends
  const members = useMemo(() => {
    if (!group || !personality) return [];
    return group.memberIds
      .map(id => {
        if (id === userId) {
          return {
            userId,
            displayName: `You`,
            vector: personality.vector,
            dominant: personality.dominant,
          };
        }
        const f = friends.find(fr => fr.userId === id);
        return f ? { userId: f.userId, displayName: f.displayName, vector: f.vector, dominant: f.dominant } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [group, userId, personality, friends]);

  const groupVector = useMemo(
    () => computeGroupVector(members.map(m => m.vector)),
    [members]
  );

  useEffect(() => {
    if (!group || members.length === 0) return;
    setLoading(true);
    fetch('/api/group-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personality_vector: groupVector,
        member_vectors: members.map(m => m.vector),
      }),
    })
      .then(r => r.json())
      .then((data: GroupScoredExperience[]) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [group, groupVector, members]);

  const sorted = useMemo(() => {
    return [...results].sort((a, b) =>
      sortMode === 'allSatisfied'
        ? b.minMemberScore - a.minMemberScore
        : b.score - a.score
    );
  }, [results, sortMode]);

  function handleBack() {
    setActiveGroup(null);
    router.push('/discover');
  }

  if (!group) {
    return (
      <div className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted mb-4">Group not found.</p>
        <button
          onClick={() => router.push('/friends')}
          className="rounded-pill bg-[#0B6E2A] px-6 py-2 text-white"
        >
          Back to Friends
        </button>
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted mb-4">Complete your personality profile first.</p>
        <button
          onClick={() => router.push('/onboarding')}
          className="rounded-pill bg-[#0B6E2A] px-6 py-2 text-white"
        >
          Start Onboarding
        </button>
      </div>
    );
  }

  const avgGroupFit = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length * 100)
    : 0;
  const minGroupFit = results.length > 0
    ? Math.round(Math.min(...results.map(r => r.minMemberScore)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="page-standard"
    >
      <div className="page-shell pb-24">

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10">
          <div className="flex-1 text-center md:text-left">
            <button
              onClick={handleBack}
              className="text-xs text-text-3 hover:text-white transition-colors mb-3 flex items-center gap-1"
            >
              ← Back to individual mode
            </button>
            <h1 className="text-4xl font-display text-white mb-2">{group.name}</h1>
            <p className="text-text-2 text-sm mb-6">
              {members.length} traveler{members.length !== 1 ? 's' : ''} ·{' '}
              {members.map(m => m.displayName).join(', ')}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="surface-card rounded-card px-4 py-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{avgGroupFit}%</div>
                <div className="text-[10px] text-text-3">Avg group fit</div>
              </div>
              <div className="surface-card rounded-card px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#4ade80]">{minGroupFit}%</div>
                <div className="text-[10px] text-text-3">Weakest link</div>
              </div>
              <div className="surface-card rounded-card px-4 py-3 text-center">
                <div className="text-2xl font-bold text-white">{results.length}</div>
                <div className="text-[10px] text-text-3">Experiences</div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <GroupRadarOverlay members={members} size={260} />
          </div>
        </div>

        {/* Sort toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSortMode('group')}
            className={`text-xs px-4 py-1.5 rounded-pill border transition-colors ${
              sortMode === 'group'
                ? 'bg-amber-400 border-amber-400 text-black font-medium'
                : 'border-[#333] text-text-2 hover:border-[#555]'
            }`}
          >
            Best for group
          </button>
          <button
            onClick={() => setSortMode('allSatisfied')}
            className={`text-xs px-4 py-1.5 rounded-pill border transition-colors ${
              sortMode === 'allSatisfied'
                ? 'bg-[#4ade80] border-[#4ade80] text-black font-medium'
                : 'border-[#333] text-text-2 hover:border-[#555]'
            }`}
          >
            All members satisfied
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-surface rounded-card animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-text-3 text-sm">No experiences found. Make sure you&apos;ve seeded a destination first.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(exp => (
              <GroupExperienceCard key={exp.id} exp={exp} members={members} />
            ))}
          </div>
        )}

      </div>
    </motion.div>
  );
}
