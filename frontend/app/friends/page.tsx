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
const secondaryBtnCls = "border border-[#D6DCCD] text-[#1A2E1C]/70 text-sm px-4 py-2 rounded-pill hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors";
const primaryBtnCls = "bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors whitespace-nowrap disabled:opacity-50";

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
    if (!friend) { setAddError('Невалиден код. Постави пълния линк или base64 кода на приятел.'); return; }
    if (friend.userId === userId) { setAddError('Това е твоят собствен профил.'); return; }
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
    if (!personality) { setJoinError('Трябва да завършиш onboarding-а първо.'); return; }
    setJoining(true);
    const group = await joinGroup(id);
    setJoining(false);
    if (!group) { setJoinError('Групата не е намерена. Провери ID-то.'); return; }
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
      <div className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted mb-4">Завърши своя профил първо, за да споделяш и създаваш групи.</p>
        <button onClick={() => router.push('/onboarding')} className="rounded-pill bg-[#0B6E2A] px-6 py-2 text-white">
          Започни Onboarding
        </button>
      </div>
    );
  }

  const dominantColor = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="page-standard"
    >
      <div className="page-shell pb-24 flex flex-col gap-12">

        {/* ── Section 1: Твоят профил ── */}
        <section>
          <h1 className="text-3xl font-display mb-1" style={{ color: dominantColor }}>Твоят профил</h1>
          <p className="text-[#1A2E1C]/65 text-sm mb-6">Сподели своя код, за да те добавят като спътник.</p>

          <div className="surface-card rounded-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-[#1A2E1C]/40 mb-1">Твоят ID</div>
                <div className="font-mono text-sm text-[#1A2E1C]">{userId}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#1A2E1C]/40 mb-1">Тип</div>
                <div className="text-sm font-medium" style={{ color: dominantColor }}>
                  {PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].emoji} {personality.dominant}
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleCopyProfile}
                className="flex-1 min-w-[140px] bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors">
                {profileCopied ? 'Копирано!' : 'Копирай профил линк'}
              </button>
              <button onClick={() => setShowProfileQR(v => !v)} className={`flex-1 min-w-[120px] ${secondaryBtnCls}`}>
                {showProfileQR ? 'Скрий QR' : 'Покажи QR'}
              </button>
            </div>
            <AnimatePresence>
              {showProfileQR && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="flex flex-col items-center gap-2 overflow-hidden">
                  <ProfileQR url={shareUrl} size={180} />
                  <p className="text-xs text-[#1A2E1C]/40 text-center max-w-[200px]">
                    Скенирай с приятел за да те добави
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 2: Спътници ── */}
        <section>
          <h2 className="text-xl mb-4">Спътници</h2>
          <div className="surface-card rounded-card p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65">Постави профил линк или base64 код на приятел:</p>
            <div className="flex gap-2">
              <input type="text" value={addInput}
                onChange={e => { setAddInput(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                placeholder="https://… или base64 код"
                className={inputCls} />
              <button onClick={handleAddFriend}
                className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#095A22] transition-colors whitespace-nowrap">
                Добави
              </button>
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>

          {friends.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">Нямаш спътници все още.</p>
          ) : (
            <AnimatePresence>
              {friends.map(friend => {
                const color = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#ccc';
                const emoji = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '🧭';
                return (
                  <motion.div key={friend.userId}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
                    className="surface-card rounded-card p-4 mb-3 flex items-center gap-4">
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

        {/* ── Section 3: Групи ── */}
        <section>
          <h2 className="text-xl mb-4">Групи за пътуване</h2>

          {/* Join group */}
          <div className="surface-card rounded-card p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65 font-medium">Присъедини се към съществуваща група:</p>
            <div className="flex gap-2">
              <input type="text" value={joinInput}
                onChange={e => { setJoinInput(e.target.value); setJoinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoinById()}
                placeholder="Group ID или линк"
                className={inputCls} />
              <button onClick={handleJoinById} disabled={joining} className={primaryBtnCls}>
                {joining ? '…' : 'Join'}
              </button>
            </div>
            {joinError && <p className="text-xs text-red-600">{joinError}</p>}
          </div>

          {/* Create group */}
          <div className="surface-card rounded-card p-4 mb-6 flex flex-col gap-3">
            <p className="text-xs text-[#1A2E1C]/65 font-medium">Създай нова група:</p>
            <div className="flex gap-2">
              <input type="text" value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                placeholder="Име на групата (напр. Алпи 2025)"
                className={inputCls} />
              <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className={primaryBtnCls}>
                {creating ? '…' : 'Създай'}
              </button>
            </div>
            <p className="text-[11px] text-[#1A2E1C]/40">
              След като създадеш група, сподели линка с приятели — те join-ват директно.
            </p>
          </div>

          {/* My groups list */}
          {groupsLoading ? (
            <div className="h-20 bg-[#D6DCCD] rounded-card animate-pulse" />
          ) : myGroups.length === 0 ? (
            <p className="text-[#1A2E1C]/40 text-sm">Не си в никоя група все още.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {myGroups.map(group => (
                <div key={group.id} className="surface-card rounded-card p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-[#1A2E1C]">{group.name}</h3>
                      <p className="text-xs text-[#1A2E1C]/40 mt-0.5">
                        {group.members.length} член{group.members.length !== 1 ? 'а' : ''} ·{' '}
                        {group.members.map(m => m.displayName).join(', ')}
                      </p>
                      {group.destination && (
                        <p className="text-xs text-[#1A2E1C]/65 mt-1">📍 {group.destination}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteGroup(group.id)}
                      className="text-[#1A2E1C]/30 hover:text-red-600 transition-colors text-xs shrink-0">
                      Разпусни
                    </button>
                  </div>

                  {group.members.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {group.members.map(m => {
                        const color = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#888';
                        const emoji = PERSONALITY_INFO[m.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '●';
                        return (
                          <div key={m.userId} className="flex items-center gap-1.5 bg-[#E5E9DF] border border-[#D6DCCD] rounded-pill px-2 py-1">
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
                      {copiedGroupId === group.id ? 'Копирано!' : 'Копирай invite линк'}
                    </button>
                    <button onClick={() => handlePlanTrip(group)}
                      className="flex-1 bg-[#0B6E2A] text-white text-sm px-3 py-2 rounded-pill hover:bg-[#095A22] transition-colors">
                      Планирай заедно →
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
