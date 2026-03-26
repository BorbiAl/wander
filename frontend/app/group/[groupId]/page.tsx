'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { StoredGroup } from '@/app/lib/store';
import { PERSONALITY_INFO } from '@/app/lib/data';
import { GroupScoredExperience } from '@/app/lib/data';
import { computeGroupVector } from '@/app/lib/hmm';
import { GroupRadarOverlay } from '@/components/GroupRadarOverlay';
import { GroupExperienceCard } from '@/components/GroupExperienceCard';

function compatibilityPct(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  const cosine = dot / (magA * magB); // 0..1 for non-negative vectors
  // Cosine of 1.0 = identical profiles, ~0.2 = orthogonal (completely different types)
  // Rescale [0.2, 1.0] → [0, 100] so orthogonal personalities show 0%, not 20%
  return Math.round(Math.max(0, (cosine - 0.2) / 0.8) * 100);
}

export default function GroupDiscoverPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { userId, personality, seedLocation, seedStatus, setActiveGroup } = useApp();

  const [group, setGroup] = useState<StoredGroup | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [destInput, setDestInput] = useState('');
  const [settingDest, setSettingDest] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [results, setResults] = useState<GroupScoredExperience[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [sortMode, setSortMode] = useState<'group' | 'allSatisfied'>('group');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMemberCount = useRef(0);
  const groupId = params.groupId;

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) { setLoadingGroup(false); return; }
      const data: StoredGroup = await res.json();
      setGroup(data);
      setLoadingGroup(false);
      prevMemberCount.current = data.members.length;
    } catch { setLoadingGroup(false); }
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchGroup();
    pollingRef.current = setInterval(fetchGroup, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchGroup]);

  const groupVector = useMemo(() => {
    if (!group || group.members.length === 0) return null;
    return computeGroupVector(group.members.map(m => m.vector));
  }, [group]);

  async function handleSetDestination() {
    const dest = destInput.trim() || group?.destination;
    if (!dest || !group) return;
    setSettingDest(true);
    await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: dest }),
    });
    await seedLocation(dest);
    setSettingDest(false);
    setDestInput('');
    await fetchGroup();
  }

  function handleCopyInvite() {
    const url = `${window.location.origin}/friends?join=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000);
    });
  }

  function handleBack() { setActiveGroup(null); router.push('/discover'); }

  const compatMatrix = useMemo(() => {
    if (!group) return [];
    return group.members.map(a => group.members.map(b => compatibilityPct(a.vector, b.vector)));
  }, [group]);

  const pairwiseCompat = useMemo(() => {
    if (!group || group.members.length < 2) return [] as number[];
    const values: number[] = [];
    for (let i = 0; i < group.members.length; i += 1) {
      for (let j = i + 1; j < group.members.length; j += 1) {
        values.push(compatMatrix[i][j]);
      }
    }
    return values;
  }, [group, compatMatrix]);

  const avgGroupFit = useMemo(() => {
    if (pairwiseCompat.length === 0) return 100;
    const sum = pairwiseCompat.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / pairwiseCompat.length);
  }, [pairwiseCompat]);

  const worstFit = useMemo(() => {
    if (pairwiseCompat.length === 0) return 100;
    return Math.min(...pairwiseCompat);
  }, [pairwiseCompat]);

  useEffect(() => {
    async function fetchResults() {
      if (!group || !groupVector || !group.destination) {
        setResults([]);
        return;
      }

      setLoadingResults(true);
      try {
        const res = await fetch('/api/group-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personality_vector: groupVector,
            member_vectors: group.members.map((m) => m.vector),
            location: group.destination,
          }),
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as GroupScoredExperience[];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    }

    void fetchResults();
  }, [group, groupVector]);

  const sorted = useMemo(() => {
    const copy = [...results];
    if (sortMode === 'allSatisfied') {
      return copy.sort((a, b) => b.minMemberScore - a.minMemberScore || b.score - a.score);
    }
    return copy.sort((a, b) => b.score - a.score || b.minMemberScore - a.minMemberScore);
  }, [results, sortMode]);

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 flex min-h-screen items-center justify-center">
        <div className="text-[#1A2E1C]/40 text-sm">Loading group…</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E5E9DF] text-[#1A2E1C] font-sans px-4 text-center">
        <p className="text-muted mb-4">Group not found.</p>
        <button onClick={() => router.push('/friends')}
          className="rounded-full bg-[#0B6E2A] text-white px-6 py-2 shadow-md">Back</button>
      </div>
    );
  }

  const radarMembers = group.members.map(m => ({
    displayName: m.userId === userId ? 'You' : m.displayName,
    vector: m.vector,
    dominant: m.dominant,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 pb-24">

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          <div className="flex-1">
            <button onClick={handleBack}
              className="text-xs text-[#1A2E1C]/40 hover:text-[#1A2E1C] transition-colors mb-3 flex items-center gap-1">
              ← Back to individual mode
            </button>
            <h1 className="text-4xl font-bold tracking-tighter leading-tight text-[#1A2E1C] mb-1">{group.name}</h1>
            <p className="text-[#1A2E1C]/65 text-sm mb-4">
              {group.members.length} traveler{group.members.length !== 1 ? 's' : ''}
              {group.destination ? ` · 📍 ${group.destination}` : ' · no destination'}
            </p>

            <button onClick={handleCopyInvite}
              className="text-xs border border-[#D6DCCD] text-[#1A2E1C]/65 px-3 py-1.5 rounded-full hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors mb-6">
              {copiedInvite ? 'Link copied!' : '🔗 Copy invite link'}
            </button>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#F5A623]">{avgGroupFit}%</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Avg group fit</div>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#0B6E2A]">{worstFit}%</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Min fit</div>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#1A2E1C]">{group.members.length}</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Members</div>
              </div>
            </div>

            {/* Destination setter */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 flex flex-col gap-2 mb-2">
              <p className="text-xs text-[#1A2E1C]/65 font-medium">
                {group.destination ? `Change destination (current: ${group.destination})` : 'Set a destination for the group'}
              </p>
              <div className="flex gap-2">
                <input type="text" value={destInput}
                  onChange={e => setDestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetDestination()}
                  placeholder={group.destination || 'e.g. Sofia, Bulgaria'}
                  className="flex-1 bg-[#E5E9DF] border border-[#D6DCCD] rounded-lg px-3 py-2 text-sm text-[#1A2E1C] placeholder:text-[#1A2E1C]/30 outline-none focus:border-[#0B6E2A]" />
                <button onClick={handleSetDestination} disabled={settingDest || (!destInput.trim() && !group.destination)}
                  className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#095A22] transition-colors disabled:opacity-50 whitespace-nowrap">
                  {settingDest ? (seedStatus === 'loading' ? 'Loading…' : '…') : 'Set'}
                </button>
              </div>
              <p className="text-[11px] text-[#1A2E1C]/40">
                Any member can set the destination — experiences load for the whole group.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-center md:self-start">
            <GroupRadarOverlay members={radarMembers} size={240} />
          </div>
        </div>

        {/* Compatibility matrix */}
        {group.members.length >= 2 && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] p-6 transition-all hover:bg-white/80 mb-8">
            <h2 className="text-sm font-medium text-[#1A2E1C] mb-4">Compatibility between members</h2>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-[#1A2E1C]/40 text-left pb-2 pr-3"></th>
                    {group.members.map(m => (
                      <th key={m.userId} className="text-[#1A2E1C]/40 pb-2 px-2 font-normal text-center">
                        {m.userId === userId ? 'You' : m.displayName.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((rowMember, ri) => (
                    <tr key={rowMember.userId}>
                      <td className="text-[#1A2E1C]/65 pr-3 py-1 whitespace-nowrap">
                        {PERSONALITY_INFO[rowMember.dominant as keyof typeof PERSONALITY_INFO]?.emoji}{' '}
                        {rowMember.userId === userId ? 'You' : rowMember.displayName.split(' ')[0]}
                      </td>
                      {group.members.map((colMember, ci) => {
                        const pct = compatMatrix[ri]?.[ci] ?? 0;
                        const isSelf = ri === ci;
                        // Use darker shades that work on light background
                        const color = isSelf ? '#A8B09F' : pct >= 70 ? '#0B6E2A' : pct >= 45 ? '#B45309' : '#B91C1C';
                        return (
                          <td key={colMember.userId} className="px-2 py-1 text-center">
                            <span style={{ color }} className="font-semibold">
                              {isSelf ? '—' : `${pct}%`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Waiting state */}
        {!group.destination && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] p-6 transition-all hover:bg-white/80 mb-8 text-center">
            <p className="text-[#1A2E1C]/65 text-sm mb-2">Waiting for friends to join?</p>
            <p className="text-[#1A2E1C]/40 text-xs">
              Copy the invite link above and send it to them. The page updates automatically.
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D6DCCD] animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Sort toggle */}
        {results.length > 0 && (
          <div className="flex gap-2 mb-6">
            <button onClick={() => setSortMode('group')}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                sortMode === 'group'
                  ? 'bg-amber-500 border-amber-500 text-[#1A2E1C] font-medium'
                  : 'border-[#D6DCCD] text-[#1A2E1C]/65 hover:border-[#A8B09F]'
              }`}>
              Best for the group
            </button>
            <button onClick={() => setSortMode('allSatisfied')}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                sortMode === 'allSatisfied'
                  ? 'bg-[#0B6E2A] border-[#0B6E2A] text-[#1A2E1C] font-medium'
                  : 'border-[#D6DCCD] text-[#1A2E1C]/65 hover:border-[#A8B09F]'
              }`}>
              Everyone satisfied
            </button>
          </div>
        )}

        {/* Results */}
        {loadingResults ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#D6DCCD] rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 && group.destination ? (
          <p className="text-[#1A2E1C]/40 text-sm">No experiences found. Try a different destination.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(exp => (
              <GroupExperienceCard key={exp.id} exp={exp} members={radarMembers} />
            ))}
          </div>
        )}

      </div>
    </motion.div>
  );
}
