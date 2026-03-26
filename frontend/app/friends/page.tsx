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
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20"
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20 lg:px-10 pb-32 flex flex-col gap-16">

        {/* ── Your profile ── */}
        <section className="flex flex-col sm:flex-row items-start gap-8">
          <div className="flex-1">
            <div className="text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/40 mb-3">Your profile</div>
            <h1 className="mb-2 text-5xl sm:text-6xl font-bold tracking-[-0.04em] leading-[1.1]" style={{ color: dominantColor }}>
              {personality.dominant}
            </h1>
            <p className="text-[#1A2E1C]/40 text-sm mb-8 font-mono">{userId}</p>
            <button onClick={handleCopyProfile} className="bg-[#0B6E2A] text-white text-[14px] font-semibold tracking-wide px-6 py-3 rounded-full hover:bg-[#095A22] transition-all shadow-md hover:shadow-lg active:scale-95 shadow-[#0B6E2A]/20">
              {profileCopied ? 'Link copied!' : 'Copy profile link'}
            </button>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-2 opacity-80">
            <ProfileQR url={shareUrl} size={130} />
            <p className="text-xs text-[#1A2E1C]/40">Scan to add me</p>
          </div>
        </section>

        {/* ── Companions ── */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-1">Companions</h2>
          <p className="text-[#1A2E1C]/50 text-sm mb-6">Paste a friend's profile link to add them.</p>

          <div className="flex gap-3 mb-4">
            <input type="text" value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
              placeholder="https://… or base64 code"
              className={inputCls}
            />
            <button onClick={handleAddFriend} className="bg-[#0B6E2A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#095A22] transition-colors whitespace-nowrap">
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mb-4">{addError}</p>}

          {friends.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">No companions yet.</p>
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
                      className="bg-white/60 backdrop-blur-md border border-white/50 rounded-[20px] p-4 flex items-center gap-4 hover:bg-white/80 transition-colors"
                    >
                      <div className="shrink-0"><PersonalityRadar vector={friend.vector} size={64} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#1A2E1C] truncate">{friend.displayName}</div>
                        <div className="text-xs mt-0.5" style={{ color }}>{emoji} {friend.dominant}</div>
                        <div className="text-[10px] text-[#1A2E1C]/30 mt-1 font-mono">{friend.userId}</div>
                      </div>
                      <button onClick={() => removeFriend(friend.userId)} className="text-[#1A2E1C]/25 hover:text-red-500 transition-colors text-sm shrink-0">✕</button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ── Travel groups ── */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-8">Travel groups</h2>

          <div className="flex flex-col gap-8 mb-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A2E1C]/40 mb-3">Join an existing group</p>
              <div className="flex gap-3">
                <input type="text" value={joinInput}
                  onChange={e => { setJoinInput(e.target.value); setJoinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoinById()}
                  placeholder="Group ID or invite link"
                  className={inputCls}
                />
                <button onClick={handleJoinById} disabled={joining} className="bg-[#0B6E2A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#095A22] transition-colors whitespace-nowrap disabled:opacity-50">
                  {joining ? '…' : 'Join'}
                </button>
              </div>
              {joinError && <p className="text-xs text-red-600 mt-2">{joinError}</p>}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A2E1C]/40 mb-3">Create a new group</p>
              <div className="flex gap-3">
                <input type="text" value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                  placeholder="Group name (e.g. Alps 2025)"
                  className={inputCls}
                />
                <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className="bg-[#0B6E2A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#095A22] transition-colors whitespace-nowrap disabled:opacity-50">
                  {creating ? '…' : 'Create'}
                </button>
              </div>
              <p className="text-[11px] text-[#1A2E1C]/40 mt-2">Once created, share the invite link — friends join directly.</p>
            </div>
          </div>

          {groupsLoading ? (
            <div className="h-24 bg-[#D6DCCD]/60 rounded-[20px] animate-pulse" />
          ) : myGroups.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">You're not in any group yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {myGroups.map(group => (
                <div key={group.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1A2E1C] text-lg tracking-tight">{group.name}</h3>
                      <p className="text-xs text-[#1A2E1C]/40 mt-0.5">
                        {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group.members.map(m => m.displayName).join(', ')}
                      </p>
                      {group.destination && <p className="text-xs text-[#1A2E1C]/60 mt-1">📍 {group.destination}</p>}
                    </div>
                    <button onClick={() => handleDeleteGroup(group.id)} className="text-[#1A2E1C]/25 hover:text-red-500 transition-colors text-xs font-medium shrink-0">
                      Disband
                    </button>
                  </div>

                  {group.members.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {group.members.map(m => {
                        const color = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
                        const emoji = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '●';
                        return (
                          <div key={m.userId} className="flex items-center gap-1.5 bg-[#E5E9DF] border border-[#D6DCCD] rounded-full px-3 py-1">
                            <span className="text-xs">{emoji}</span>
                            <span className="text-xs font-medium text-[#1A2E1C]">{m.displayName}</span>
                            <span className="text-[10px]" style={{ color }}>{m.dominant}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => handleCopyGroupLink(group.id)} className="flex-1 bg-white/60 backdrop-blur-md border border-[#D6DCCD] text-[#1A2E1C] text-[14px] font-semibold tracking-wide py-2.5 rounded-full hover:bg-white transition-all shadow-sm active:scale-95">
                      {copiedGroupId === group.id ? 'Copied!' : 'Copy invite link'}
                    </button>
                    <button onClick={() => handlePlanTrip(group)} className="flex-1 bg-[#0B6E2A] text-white text-[14px] font-semibold tracking-wide py-2.5 rounded-full hover:bg-[#095A22] transition-all shadow-md active:scale-95 shadow-[#0B6E2A]/20">
                      Plan together →
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