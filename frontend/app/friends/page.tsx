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

// Light-theme input used throughout this page
const inputCls = "flex-1 bg-[#E5E9DF] border border-[#D6DCCD] rounded-lg px-3 py-2 text-sm text-[#1A2E1C] placeholder:text-[#1A2E1C]/30 outline-none focus:border-[#0B6E2A]";
const secondaryBtnCls = "border border-[#D6DCCD] text-[#1A2E1C]/70 text-sm px-4 py-2 rounded-full hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors";
const primaryBtnCls = "bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-full hover:bg-[#095A22] transition-colors whitespace-nowrap disabled:opacity-50";

export default function FriendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userId, personality,
    friends, addFriend, removeFriend,
    createGroup, joinGroup, setActiveGroup,
  } = useApp();

  const [showProfileQR, setShowProfileQR] = useState(false);
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
    if (searchParams.get('share') === '1') setShowProfileQR(true);
  }, [searchParams]);

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
        <p className="text-muted mb-4">Complete your profile first to share and create groups.</p>
        <button onClick={() => router.push('/onboarding')} className="rounded-full bg-[#0B6E2A] text-white px-6 py-2 shadow-md">
          Start Onboarding
        </button>
      </div>
    );
  }

  const dominantColor = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 pb-24 flex flex-col gap-12">

        {/* ── Section 1: Your profile ── */}
        <section>
          <h1 className="text-3xl font-bold tracking-tighter leading-tight mb-1" style={{ color: dominantColor }}>Your profile</h1>
          <p className="text-[#1A2E1C]/65 text-sm mb-6">Share your link so others can add you as a companion.</p>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-[#1A2E1C]/40 mb-1">Your ID</div>
                <div className="font-mono text-sm text-[#1A2E1C]">{userId}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#1A2E1C]/40 mb-1">Type</div>
                <div className="text-sm font-medium" style={{ color: dominantColor }}>
                  {PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].emoji} {personality.dominant}
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleCopyProfile}
                className="flex-1 min-w-[140px] bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-full hover:bg-[#095A22] transition-colors">
                {profileCopied ? 'Copied!' : 'Copy profile link'}
              </button>
              <button onClick={() => setShowProfileQR(v => !v)} className={`flex-1 min-w-[120px] ${secondaryBtnCls}`}>
                {showProfileQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>
            <AnimatePresence>
              {showProfileQR && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="flex flex-col items-center gap-2 overflow-hidden">
                  <ProfileQR url={shareUrl} size={180} />
                  <p className="text-xs text-[#1A2E1C]/40 text-center max-w-[200px]">
                    Scan with a friend to add you as a companion
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 2: Companions ── */}
        <section>
          <h2 className="text-xl mb-4">Companions</h2>
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65">Paste a profile link or base64 code of a friend:</p>
            <div className="flex gap-2">
              <input type="text" value={addInput}
                onChange={e => { setAddInput(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                placeholder="https://… or base64 code"
                className={inputCls} />
              <button onClick={handleAddFriend}
                className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-full hover:bg-[#095A22] transition-colors whitespace-nowrap">
                Добави
              </button>
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>

          {friends.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">No companions yet.</p>
          ) : (
            <AnimatePresence>
              {friends.map(friend => {
                const color = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#ccc';
                const emoji = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '🧭';
                return (
                  <motion.div key={friend.userId}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
                    className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 mb-3 flex items-center gap-4">
                    <div className="shrink-0">
                      <PersonalityRadar vector={friend.vector} size={72} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[#1A2E1C] truncate">{friend.displayName}</div>
                      <div className="text-xs mt-0.5" style={{ color }}>{emoji} {friend.dominant}</div>
                      <div className="text-[10px] text-[#1A2E1C]/40 mt-1 font-mono">{friend.userId}</div>
                    </div>
                    <button onClick={() => removeFriend(friend.userId)}
                      className="text-[#1A2E1C]/30 hover:text-red-600 transition-colors text-sm shrink-0">✕</button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </section>

        {/* ── Section 3: Travel groups ── */}
        <section>
          <h2 className="text-xl mb-4">Travel groups</h2>

          {/* Join group */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65 font-medium">Join an existing group:</p>
            <div className="flex gap-2">
              <input type="text" value={joinInput}
                onChange={e => { setJoinInput(e.target.value); setJoinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoinById()}
                placeholder="Group ID or link"
                className={inputCls} />
              <button onClick={handleJoinById} disabled={joining} className={primaryBtnCls}>
                {joining ? '…' : 'Join'}
              </button>
            </div>
            {joinError && <p className="text-xs text-red-600">{joinError}</p>}
          </div>

          {/* Create group */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-4 mb-6 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65 font-medium">Create a new group:</p>
            <div className="flex gap-2">
              <input type="text" value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                placeholder="Group name (e.g. Alps 2025)"
                className={inputCls} />
              <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className={primaryBtnCls}>
                {creating ? '…' : 'Create'}
              </button>
            </div>
            <p className="text-[11px] text-[#1A2E1C]/40">
              Once created, share the invite link with friends — they join directly.
            </p>
          </div>

          {/* My groups list */}
          {groupsLoading ? (
            <div className="h-20 bg-[#D6DCCD] rounded-[24px] animate-pulse" />
          ) : myGroups.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">You're not in any group yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {myGroups.map(group => (
                <div key={group.id} className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[24px] p-6 transition-all hover:bg-white/80 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#1A2E1C]">{group.name}</h3>
                      <p className="text-xs text-[#1A2E1C]/40 mt-0.5">
                        {group.members.length} member{group.members.length !== 1 ? 's' : ''} ·{' '}
                        {group.members.map(m => m.displayName).join(', ')}
                      </p>
                      {group.destination && (
                        <p className="text-xs text-[#1A2E1C]/65 mt-1">📍 {group.destination}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteGroup(group.id)}
                      className="text-[#1A2E1C]/30 hover:text-red-600 transition-colors text-xs shrink-0">
                      Disband
                    </button>
                  </div>

                  {group.members.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {group.members.map(m => {
                        const color = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
                        const emoji = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '●';
                        return (
                          <div key={m.userId} className="flex items-center gap-1.5 bg-[#E5E9DF] border border-[#D6DCCD] rounded-full px-2 py-1">
                            <span className="text-xs">{emoji}</span>
                            <span className="text-xs text-[#1A2E1C]">{m.displayName}</span>
                            <span className="text-[10px]" style={{ color }}>{m.dominant}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleCopyGroupLink(group.id)} className={`flex-1 ${secondaryBtnCls}`}>
                      {copiedGroupId === group.id ? 'Copied!' : 'Copy invite link'}
                    </button>
                    <button onClick={() => handlePlanTrip(group)}
                      className="flex-1 bg-[#0B6E2A] text-white text-sm px-3 py-2 rounded-full hover:bg-[#095A22] transition-colors">
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