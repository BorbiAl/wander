'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { PERSONALITY_INFO } from '@/app/lib/data';
import { buildShareUrl, decodeProfileLink } from '@/app/lib/friendUtils';
import { ProfileQR } from '@/components/ProfileQR';
import { PersonalityRadar } from '@/components/PersonalityRadar';

export default function FriendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userId, personality,
    friends, groups,
    addFriend, removeFriend, createGroup, deleteGroup, setActiveGroup,
  } = useApp();

  const addedFromUrl = useRef(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const shareUrl = personality
    ? buildShareUrl(userId, personality.vector, personality.dominant, `Traveler #${userId.slice(-4)}`)
    : '';

  // Auto-open share section if ?share=1 in URL
  useEffect(() => {
    if (searchParams.get('share') === '1') setShowQR(true);
  }, [searchParams]);

  // Auto-add friend if ?add=... in URL — run once only
  useEffect(() => {
    if (addedFromUrl.current) return;
    const addParam = searchParams.get('add');
    if (!addParam) return;
    addedFromUrl.current = true;
    const friend = decodeProfileLink(addParam);
    if (friend && friend.userId !== userId) {
      addFriend(friend);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — we only want this to fire once on mount

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleAddFriend() {
    setAddError('');
    const friend = decodeProfileLink(addInput.trim());
    if (!friend) {
      setAddError('Invalid profile code. Paste the full link or code from a friend.');
      return;
    }
    if (friend.userId === userId) {
      setAddError("That's your own profile.");
      return;
    }
    addFriend(friend);
    setAddInput('');
  }

  function toggleMember(id: string) {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  function handleCreateGroup() {
    if (!groupName.trim()) return;
    // Always include self
    const memberIds = Array.from(new Set([userId, ...selectedMemberIds]));
    if (memberIds.length < 2) return;
    createGroup(groupName.trim(), memberIds);
    setGroupName('');
    setSelectedMemberIds([]);
  }

  function handlePlanTrip(groupId: string) {
    setActiveGroup(groupId);
    router.push(`/group/${groupId}`);
  }

  if (!personality) {
    return (
      <div className="page-standard flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-muted mb-4">Complete your personality profile before sharing.</p>
        <button
          onClick={() => router.push('/onboarding')}
          className="rounded-pill bg-[#0B6E2A] px-6 py-2 text-white"
        >
          Start Onboarding
        </button>
      </div>
    );
  }

  const dominantColor = PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="page-standard"
    >
      <div className="page-shell pb-24 flex flex-col gap-12">

        {/* ── Section 1: Your Profile Code ── */}
        <section>
          <h1 className="text-3xl font-display mb-1" style={{ color: dominantColor }}>Travel Profile</h1>
          <p className="text-text-2 text-sm mb-6">Share your code so friends can add you to a group.</p>

          <div className="surface-card rounded-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-text-3 mb-1">Your ID</div>
                <div className="font-mono text-sm text-white">{userId}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-3 mb-1">Dominant type</div>
                <div className="text-sm font-medium" style={{ color: dominantColor }}>
                  {PERSONALITY_INFO[personality.dominant as keyof typeof PERSONALITY_INFO].emoji}{' '}
                  {personality.dominant}
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleCopyLink}
                className="flex-1 min-w-[140px] bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors"
              >
                {copied ? 'Copied!' : 'Copy profile link'}
              </button>
              <button
                onClick={() => setShowQR(v => !v)}
                className="flex-1 min-w-[120px] border border-[#333] text-text-2 text-sm px-4 py-2 rounded-pill hover:border-[#555] transition-colors"
              >
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col items-center gap-2 overflow-hidden"
                >
                  <ProfileQR url={shareUrl} size={180} />
                  <p className="text-xs text-text-3 text-center max-w-[200px]">
                    Anyone who scans this can add you as a travel companion
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 2: Friends List ── */}
        <section>
          <h2 className="text-xl mb-4">Travel Companions</h2>

          {/* Add friend input */}
          <div className="surface-card rounded-card p-4 mb-4 flex flex-col gap-3">
            <p className="text-xs text-text-2">Paste a friend&apos;s profile link or code:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addInput}
                onChange={e => { setAddInput(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                placeholder="https://… or base64 code"
                className="flex-1 bg-surface-2 border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-3 outline-none focus:border-[#555]"
              />
              <button
                onClick={handleAddFriend}
                className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#095A22] transition-colors whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
          </div>

          {friends.length === 0 ? (
            <p className="text-text-3 text-sm">No companions yet. Paste a friend&apos;s profile code above.</p>
          ) : (
            <AnimatePresence>
              {friends.map(friend => {
                const color = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#ccc';
                const emoji = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '🧭';
                return (
                  <motion.div
                    key={friend.userId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="surface-card rounded-card p-4 mb-3 flex items-center gap-4"
                  >
                    <div className="shrink-0">
                      <PersonalityRadar vector={friend.vector} size={72} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">{friend.displayName}</div>
                      <div className="text-xs mt-0.5" style={{ color }}>
                        {emoji} {friend.dominant}
                      </div>
                      <div className="text-[10px] text-text-3 mt-1 font-mono">{friend.userId}</div>
                    </div>
                    <button
                      onClick={() => removeFriend(friend.userId)}
                      className="text-text-3 hover:text-red-400 transition-colors text-sm shrink-0"
                      title="Remove companion"
                    >
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </section>

        {/* ── Section 3: Groups ── */}
        <section>
          <h2 className="text-xl mb-4">Travel Groups</h2>

          {/* Create group */}
          {friends.length > 0 && (
            <div className="surface-card rounded-card p-4 mb-6 flex flex-col gap-3">
              <p className="text-xs text-text-2 font-medium">Create a new group</p>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name (e.g. Alps Trip)"
                className="bg-surface-2 border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-3 outline-none focus:border-[#555]"
              />
              <div className="flex flex-col gap-2">
                <p className="text-xs text-text-3">Select companions (you&apos;re always included):</p>
                {friends.map(friend => {
                  const color = PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.color ?? '#ccc';
                  const checked = selectedMemberIds.includes(friend.userId);
                  return (
                    <label key={friend.userId} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(friend.userId)}
                        className="accent-[#0B6E2A]"
                      />
                      <span className="text-sm text-white">{friend.displayName}</span>
                      <span className="text-xs" style={{ color }}>
                        {PERSONALITY_INFO[friend.dominant as keyof typeof PERSONALITY_INFO]?.emoji}{' '}
                        {friend.dominant}
                      </span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
                className="bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create group
              </button>
            </div>
          )}

          {groups.length === 0 ? (
            <p className="text-text-3 text-sm">
              {friends.length === 0
                ? 'Add companions first, then create a group to plan a trip together.'
                : 'No groups yet. Create one above.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map(group => {
                const memberNames = group.memberIds.map(id => {
                  if (id === userId) return `You`;
                  return friends.find(f => f.userId === id)?.displayName ?? id.slice(0, 8);
                });
                return (
                  <div key={group.id} className="surface-card rounded-card p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{group.name}</h3>
                        <p className="text-xs text-text-3 mt-0.5">
                          {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''} ·{' '}
                          {memberNames.join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="text-text-3 hover:text-red-400 transition-colors text-xs shrink-0 ml-2"
                      >
                        Disband
                      </button>
                    </div>
                    <button
                      onClick={() => handlePlanTrip(group.id)}
                      className="w-full bg-[#0B6E2A] text-white text-sm px-4 py-2 rounded-pill hover:bg-[#095A22] transition-colors"
                    >
                      Plan trip together →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </motion.div>
  );
}
