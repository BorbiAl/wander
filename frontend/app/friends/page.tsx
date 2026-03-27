'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { StoredGroup } from '@/app/lib/store';
import { PERSONALITY_INFO } from '@/app/lib/data';
import { buildShareUrl, decodeProfileLink } from '@/app/lib/friendUtils';
import { ProfileQR } from '@/components/ProfileQR';
import { PersonalityRadar } from '@/components/PersonalityRadar';
import { EventBeforeAfter } from '@/components/EventBeforeAfter';

type Suggestion = {
  userId: string;
  displayName: string;
  dominant: string;
  vector: [number, number, number, number, number];
  compatibility: number;
};

export default function FriendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userId, personality,
    friends, addFriend, removeFriend,
    createGroup, joinGroup, setActiveGroup,
  } = useApp();

  const [profileCopied, setProfileCopied] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [myGroups, setMyGroups] = useState<StoredGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const addedFromUrl = useRef(false);

  const shareUrl = personality
    ? buildShareUrl(userId, personality.vector, personality.dominant, `Traveler #${userId.slice(-4)}`)
    : '';

  useEffect(() => {
    if (addedFromUrl.current) return;
    const addParam = searchParams.get('add');
    if (!addParam) return;
    addedFromUrl.current = true;
    const friend = decodeProfileLink(addParam);
    if (friend && friend.userId !== userId) addFriend(friend);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinedFromUrl = useRef(false);
  useEffect(() => {
    if (joinedFromUrl.current || !personality) return;
    const joinParam = searchParams.get('join');
    if (!joinParam) return;
    joinedFromUrl.current = true;
    joinGroup(joinParam).then(group => {
      if (group) { refreshGroups(); setActiveGroup(group.id); router.push(`/group/${group.id}`); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personality]);

  async function refreshGroups() {
    try {
      const res = await fetch('/api/groups');
      if (!res.ok) return;
      const all: StoredGroup[] = await res.json();
      setMyGroups(all.filter(g => g.members.some(m => m.userId === userId)));
    } catch { /* keep current */ } finally { setGroupsLoading(false); }
  }

  useEffect(() => { if (userId) refreshGroups(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSuggestions() {
    if (!personality) return;
    setSuggestionsLoading(true);
    try {
      const vectorParam = personality.vector.join(',');
      const res = await fetch(`/api/users/suggest?userId=${encodeURIComponent(userId)}&vector=${encodeURIComponent(vectorParam)}`);
      if (!res.ok) return;
      const data: Suggestion[] = await res.json();
      // Filter out already-added friends
      setSuggestions(data.filter(s => !friends.some(f => f.userId === s.userId)));
    } catch { /* keep empty */ } finally { setSuggestionsLoading(false); }
  }

  useEffect(() => {
    if (userId && personality) fetchSuggestions();
  }, [userId, personality]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCopyProfile() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2000);
    });
  }

  function handleAddFriend() {
    setAddError('');
    const friend = decodeProfileLink(addInput.trim());
    if (!friend) { setAddError('Invalid code. Paste the full link or base64 code of a friend.'); return; }
    if (friend.userId === userId) { setAddError('This is your own profile.'); return; }
    addFriend(friend);
    setAddInput('');
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || !personality) return;
    setCreating(true);
    const group = await createGroup(newGroupName.trim(), '');
    setCreating(false);
    if (group) { setNewGroupName(''); await refreshGroups(); }
  }

  async function handleJoinById() {
    setJoinError('');
    const id = joinInput.trim();
    if (!id) return;
    if (!personality) { setJoinError('You need to complete onboarding first.'); return; }
    setJoining(true);
    const group = await joinGroup(id);
    setJoining(false);
    if (!group) { setJoinError('Group not found. Check the ID.'); return; }
    setJoinInput('');
    await refreshGroups();
    setActiveGroup(group.id);
    router.push(`/group/${group.id}`);
  }

  function handleCopyGroupLink(groupId: string) {
    const url = `${window.location.origin}/friends?join=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedGroupId(groupId); setTimeout(() => setCopiedGroupId(null), 2000);
    });
  }

  async function handleDeleteGroup(groupId: string) {
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    setMyGroups(prev => prev.filter(g => g.id !== groupId));
  }

  function handlePlanTrip(group: StoredGroup) {
    setActiveGroup(group.id);
    router.push(`/group/${group.id}`);
  }

  if (!personality) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E5E9DF] text-[#1A2E1C] font-sans px-4 text-center">
        <p className="text-[#1A2E1C]/60 mb-6 font-medium">Complete your profile first to share and create groups.</p>
        <button onClick={() => router.push('/onboarding')} className="rounded-full bg-[#0B6E2A] px-8 py-3 text-[15px] font-semibold tracking-wide text-white transition-all hover:bg-[#095A22] hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(11,110,42,0.2)]">
          Start Onboarding
        </button>
      </div>
    );
  }

  const dominantColor = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].color;
  const inputCls = "flex-1 bg-[#E5E9DF] border border-[#D6DCCD] rounded-xl px-4 py-2.5 text-sm text-[#1A2E1C] placeholder:text-[#1A2E1C]/30 outline-none focus:border-[#0B6E2A] transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 pt-[60px] md:pt-[72px]"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-10 pb-28 md:pb-16 flex flex-col gap-8 sm:gap-14">

        {/* ── Your profile ── */}
        <section className="flex flex-col-reverse sm:flex-row items-center sm:items-start gap-6 sm:gap-8 bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-8">
          <div className="flex-1 text-center sm:text-left w-full">
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#0B6E2A] mb-2 sm:mb-3">Your profile</div>
            <h1 className="mb-2 text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.1]" style={{ color: dominantColor }}>
              {personality.dominant}
            </h1>
            <p className="text-[#1A2E1C]/40 text-xs sm:text-sm mb-6 sm:mb-8 font-mono">{userId}</p>
            <button onClick={handleCopyProfile} className="w-full sm:w-auto bg-[#0B6E2A] text-white text-[13px] sm:text-[14px] font-semibold tracking-wide px-6 py-3 rounded-full hover:bg-[#095A22] transition-all shadow-md active:scale-95 shadow-[#0B6E2A]/20">
              {profileCopied ? 'Link copied!' : 'Copy profile link'}
            </button>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#D6DCCD]/40">
              <ProfileQR url={shareUrl} size={140} />
            </div>
            <p className="text-xs font-medium text-[#1A2E1C]/50">Scan to add me</p>
          </div>
        </section>

        {/* ── Suggested companions ── */}
        <section className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-1">Suggested companions</h2>
          <p className="text-[#1A2E1C]/50 text-[13px] sm:text-sm mb-6">Other travelers matched to your personality.</p>

          {suggestionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-[#D6DCCD]/60 rounded-[20px] animate-pulse" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">No suggested companions yet — invite friends to join!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s, i) => {
                const info = PERSONALITY_INFO[s.dominant as keyof typeof PERSONALITY_INFO];
                const color = info?.color ?? '#ccc';
                const emoji = info?.emoji ?? '🧭';
                const pct = Math.round(s.compatibility * 100);
                const alreadyAdded = friends.some(f => f.userId === s.userId);
                return (
                  <motion.div key={s.userId}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className="group relative bg-white/70 backdrop-blur-md border border-white/60 rounded-[20px] p-4 overflow-hidden hover:bg-white/90 hover:shadow-md transition-all"
                  >
                    {/* left color accent bar */}
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ backgroundColor: color }} />

                    <div className="pl-3 flex items-center gap-3">
                      {/* avatar circle */}
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold" style={{ backgroundColor: color + '28', color }}>
                        {emoji}
                      </div>

                      {/* name + type */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-[#1A2E1C] truncate leading-tight">{s.displayName}</div>
                        <div className="text-[11px] font-medium mt-0.5" style={{ color }}>{s.dominant}</div>
                      </div>

                      {/* match pill */}
                      <div className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: color + '22', color }}>
                        {pct}%
                      </div>
                    </div>

                    {/* match bar */}
                    <div className="pl-3 mt-3">
                      <div className="h-1 w-full bg-[#D6DCCD] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 + 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* add button — appears on hover, always visible on touch */}
                    <div className="pl-3 mt-3 flex justify-end">
                      <button
                        disabled={alreadyAdded}
                        onClick={() => {
                          addFriend({ userId: s.userId, displayName: s.displayName, vector: s.vector, dominant: s.dominant, addedAt: Date.now() });
                          setSuggestions(prev => prev.filter(x => x.userId !== s.userId));
                        }}
                        className="text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={alreadyAdded ? {} : { backgroundColor: color, color: '#fff' }}
                      >
                        {alreadyAdded ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Companions ── */}
        <section className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-1">Companions</h2>
          <p className="text-[#1A2E1C]/50 text-[13px] sm:text-sm mb-6">Paste a friend's profile link to add them.</p>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <input type="text" value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
              placeholder="https://… or base64 code"
              className={inputCls}
            />
            <button onClick={handleAddFriend} className="w-full sm:w-auto mt-2 sm:mt-0 bg-[#0B6E2A] text-white text-[13px] sm:text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-full hover:bg-[#095A22] transition-colors whitespace-nowrap shadow-[#0B6E2A]/20 shadow-md">
              Add Friend
            </button>
          </div>
          {addError && <p className="text-[11px] sm:text-xs text-red-600 mb-4">{addError}</p>}

          {friends.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-[13px] sm:text-sm text-center py-4">No companions yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {friends.map(friend => {
                  const color = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#ccc';
                  const emoji = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '🧭';
                  return (
                    <motion.div key={friend.userId}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
                      className="bg-white/70 backdrop-blur-md border border-white/60 shadow-sm rounded-[20px] p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-white/90 transition-colors"
                    >
                      <div className="shrink-0 scale-90 sm:scale-100"><PersonalityRadar vector={friend.vector} size={64} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] sm:text-sm text-[#1A2E1C] truncate">{friend.displayName}</div>
                        <div className="text-[11px] sm:text-xs mt-0.5 font-medium" style={{ color }}>{emoji} {friend.dominant}</div>
                        <div className="text-[10px] text-[#1A2E1C]/40 mt-1 font-mono">{friend.userId}</div>
                      </div>
                      <button onClick={() => removeFriend(friend.userId)} className="text-[#1A2E1C]/30 hover:text-red-500 transition-colors text-sm sm:text-base shrink-0 p-2">✕</button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ── Travel groups ── */}
        <section className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] sm:rounded-[32px] p-5 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-6 sm:mb-8">Travel groups</h2>

          <div className="flex flex-col gap-8 mb-10">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#1A2E1C]/50 mb-2 sm:mb-3">Join an existing group</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input type="text" value={joinInput}
                  onChange={e => { setJoinInput(e.target.value); setJoinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinById()}
                  placeholder="Group ID or invite link"
                  className={inputCls}
                />
                <button onClick={handleJoinById} disabled={joining} className="w-full sm:w-auto mt-2 sm:mt-0 bg-[#1A2E1C] text-white text-[13px] sm:text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-full hover:bg-[#2A412D] transition-colors whitespace-nowrap disabled:opacity-50 shadow-sm">
                  {joining ? '…' : 'Join Group'}
                </button>
              </div>
              {joinError && <p className="text-[11px] sm:text-xs text-red-600 mt-2">{joinError}</p>}
            </div>

            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#1A2E1C]/50 mb-2 sm:mb-3">Create a new group</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input type="text" value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                  placeholder="Group name (e.g. Alps 2025)"
                  className={inputCls}
                />
                <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className="w-full sm:w-auto mt-2 sm:mt-0 bg-[#1A2E1C] text-white text-[13px] sm:text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-full hover:bg-[#2A412D] transition-colors whitespace-nowrap disabled:opacity-50 shadow-sm">
                  {creating ? '…' : 'Create Group'}
                </button>
              </div>
              <p className="text-[11px] text-[#1A2E1C]/50 mt-3 leading-relaxed">Once created, you will get an invite link you can share with your friends to join directly.</p>
            </div>
          </div>

          {groupsLoading ? (
            <div className="h-24 bg-[#D6DCCD]/60 rounded-[20px] animate-pulse" />
          ) : myGroups.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-[13px] sm:text-sm text-center py-4 border-t border-[#D6DCCD]/30 pt-8">You're not in any active group yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {myGroups.map(group => (
                <div key={group.id} className="bg-white/70 backdrop-blur-md border border-white/60 shadow-sm rounded-[24px] p-5 sm:p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1A2E1C] text-[19px] sm:text-xl tracking-tight leading-tight">{group.name}</h3>
                      <p className="text-[12px] sm:text-xs text-[#1A2E1C]/60 mt-1">
                        <span className="font-semibold text-[#0B6E2A] bg-[#0B6E2A]/10 px-2 py-0.5 rounded-full mr-2">{group.members.length} members</span> 
                        {group.members.map(m => m.displayName).join(', ')}
                      </p>
                      {group.destination && <p className="text-[12px] sm:text-xs text-[#1A2E1C]/70 mt-2 font-medium">📍 {group.destination}</p>}
                    </div>
                    <button onClick={() => handleDeleteGroup(group.id)} className="text-[10px] sm:text-[11px] text-[#1A2E1C]/30 hover:text-red-500 font-bold uppercase tracking-widest transition-colors shrink-0 bg-[#E5E9DF]/80 hover:bg-red-50 px-2 py-1.5 rounded-lg">
                      Disband
                    </button>
                  </div>

                  {group.members.length > 1 && (
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {group.members.map(m => {
                        const color = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
                        const emoji = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '●';
                        return (
                          <div key={m.userId} className="flex items-center gap-1.5 bg-[#E5E9DF]/60 border border-[#D6DCCD] rounded-full px-2.5 sm:px-3 py-1.5">
                            <span className="text-[11px] sm:text-xs">{emoji}</span>
                            <span className="text-[11px] sm:text-xs font-semibold text-[#1A2E1C] truncate max-w-[80px] sm:max-w-none">{m.displayName}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold tracking-wide uppercase" style={{ color }}>{m.dominant.slice(0, 3)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="-mx-1 my-2">
                    <EventBeforeAfter
                      title="Group events: before vs after"
                      before={group.eventsBefore ?? []}
                      after={group.eventsAfter ?? []}
                      compact
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-1">
                    <button onClick={() => handleCopyGroupLink(group.id)} className="flex-1 bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[13px] sm:text-[14px] font-semibold tracking-wide py-3 sm:py-2.5 rounded-full hover:bg-white transition-all shadow-sm active:scale-95">
                      {copiedGroupId === group.id ? 'Copied!' : 'Copy invite link'}
                    </button>
                    <button onClick={() => handlePlanTrip(group)} className="flex-1 bg-[#0B6E2A] text-white text-[13px] sm:text-[14px] font-semibold tracking-wide py-3 sm:py-2.5 rounded-full hover:bg-[#095A22] transition-all shadow-md active:scale-95 shadow-[#0B6E2A]/20">
                      Plan trip →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </motion.div>
  );
}