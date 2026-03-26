'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { StoredGroup } from '@/app/lib/store';
import { GroupScoredExperience, PERSONALITY_INFO } from '@/app/lib/data';
import { computeGroupVector } from '@/app/lib/hmm';
import { GroupRadarOverlay } from '@/components/GroupRadarOverlay';
import { GroupExperienceCard } from '@/components/GroupExperienceCard';

type SortMode = 'group' | 'allSatisfied';

function compatibilityPct(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  return Math.round(Math.min(1, dot * 4) * 100);
}

export default function GroupDiscoverPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { userId, personality, seedLocation, seedStatus, setActiveGroup } = useApp();

  const [group, setGroup] = useState<StoredGroup | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [results, setResults] = useState<GroupScoredExperience[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('group');
  const [destInput, setDestInput] = useState('');
  const [settingDest, setSettingDest] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

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
      if (data.members.length !== prevMemberCount.current && data.members.length >= 1) {
        prevMemberCount.current = data.members.length;
        fetchResults(data);
      }
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

  async function fetchResults(g: StoredGroup) {
    if (g.members.length === 0) return;
    const gv = computeGroupVector(g.members.map(m => m.vector));
    setLoadingResults(true);
    try {
      const res = await fetch('/api/group-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_vector: gv, member_vectors: g.members.map(m => m.vector) }),
      });
      if (res.ok) setResults(await res.json());
    } catch { /* keep previous */ } finally { setLoadingResults(false); }
  }

  useEffect(() => {
    if (group && groupVector) fetchResults(group);
  }, [groupVector]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (group) fetchResults({ ...group, destination: dest });
  }

  function handleCopyInvite() {
    const url = `${window.location.origin}/friends?join=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000);
    });
  }

  function handleBack() { setActiveGroup(null); router.push('/discover'); }

  const sorted = useMemo(() => {
    return [...results].sort((a, b) =>
      sortMode === 'allSatisfied' ? b.minMemberScore - a.minMemberScore : b.score - a.score
    );
  }, [results, sortMode]);

  const compatMatrix = useMemo(() => {
    if (!group) return [];
    return group.members.map(a => group.members.map(b => compatibilityPct(a.vector, b.vector)));
  }, [group]);

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 flex min-h-screen items-center justify-center">
        <div className="text-[#1A2E1C]/40 text-sm">Зарежда се групата…</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E5E9DF] text-[#1A2E1C] font-sans px-4 text-center">
        <p className="text-muted mb-4">Групата не е намерена.</p>
        <button onClick={() => router.push('/friends')}
          className="rounded-full bg-[#0B6E2A] text-white px-6 py-2 shadow-md">Обратно</button>
      </div>
    );
  }

  const avgGroupFit = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length * 100) : 0;
  const worstFit = results.length > 0
    ? Math.round(Math.min(...results.map(r => r.minMemberScore)) * 100) : 0;

  const radarMembers = group.members.map(m => ({
    displayName: m.userId === userId ? 'Ти' : m.displayName,
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
              ← Обратно към индивидуален режим
            </button>
            <h1 className="text-4xl font-bold tracking-tighter leading-tight text-[#1A2E1C] mb-1">{group.name}</h1>
            <p className="text-[#1A2E1C]/65 text-sm mb-4">
              {group.members.length} пътешественик{group.members.length !== 1 ? 'а' : ''}
              {group.destination ? ` · 📍 ${group.destination}` : ' · без дестинация'}
            </p>

            <button onClick={handleCopyInvite}
              className="text-xs border border-[#D6DCCD] text-[#1A2E1C]/65 px-3 py-1.5 rounded-full hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors mb-6">
              {copiedInvite ? 'Линкът е копиран!' : '🔗 Копирай invite линк'}
            </button>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#F5A623]-600">{avgGroupFit}%</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Средна група</div>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#0B6E2A]">{worstFit}%</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Минимален fit</div>
              </div>
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#1A2E1C]">{group.members.length}</div>
                <div className="text-[10px] text-[#1A2E1C]/40">Членове</div>
              </div>
            </div>

            {/* Destination setter */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 flex flex-col gap-2 mb-2">
              <p className="text-xs text-[#1A2E1C]/65 font-medium">
                {group.destination ? `Промени дестинацията (сега: ${group.destination})` : 'Избери дестинация за групата'}
              </p>
              <div className="flex gap-2">
                <input type="text" value={destInput}
                  onChange={e => setDestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetDestination()}
                  placeholder={group.destination || 'напр. Sofia, Bulgaria'}
                  className="flex-1 bg-[#E5E9DF] border border-[#D6DCCD] rounded-lg px-3 py-2 text-sm text-[#1A2E1C] placeholder:text-[#1A2E1C]/30 outline-none focus:border-[#0B6E2A]" />
                <button onClick={handleSetDestination} disabled={settingDest || (!destInput.trim() && !group.destination)}
                  className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#095A22] transition-colors disabled:opacity-50 whitespace-nowrap">
                  {settingDest ? (seedStatus === 'loading' ? 'Зарежда…' : '…') : 'Задай'}
                </button>
              </div>
              <p className="text-[11px] text-[#1A2E1C]/40">
                Всеки член може да зададе дестинация — преживяванията се зареждат за цялата група.
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
            <h2 className="text-sm font-medium text-[#1A2E1C] mb-4">Compatibility между членовете</h2>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-[#1A2E1C]/40 text-left pb-2 pr-3"></th>
                    {group.members.map(m => (
                      <th key={m.userId} className="text-[#1A2E1C]/40 pb-2 px-2 font-normal text-center">
                        {m.userId === userId ? 'Ти' : m.displayName.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((rowMember, ri) => (
                    <tr key={rowMember.userId}>
                      <td className="text-[#1A2E1C]/65 pr-3 py-1 whitespace-nowrap">
                        {PERSONALITY_INFO[rowMember.dominant as keyof typeof PERSONALITY_INFO]?.emoji}{' '}
                        {rowMember.userId === userId ? 'Ти' : rowMember.displayName.split(' ')[0]}
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
            <p className="text-[#1A2E1C]/65 text-sm mb-2">Изчакваш приятелите ти да се присъединят?</p>
            <p className="text-[#1A2E1C]/40 text-xs">
              Копирай invite линка горе и им го прати. Страницата се обновява автоматично.
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
              Най-добро за групата
            </button>
            <button onClick={() => setSortMode('allSatisfied')}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                sortMode === 'allSatisfied'
                  ? 'bg-[#0B6E2A] border-[#0B6E2A] text-[#1A2E1C] font-medium'
                  : 'border-[#D6DCCD] text-[#1A2E1C]/65 hover:border-[#A8B09F]'
              }`}>
              Всички доволни
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
          <p className="text-[#1A2E1C]/40 text-sm">Няма намерени преживявания. Опитай с различна дестинация.</p>
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
