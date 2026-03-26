'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { getExperience, getHost, getVillage, percentageMatch, cwsColor } from '@/app/lib/utils';
import { PERSONALITIES, PERSONALITY_INFO, VILLAGES } from '@/app/lib/data';

export default function ExperiencePage() {
  const { id } = useParams();
  const router = useRouter();
  const { personality, addBooking, addPoints, addBadge, bookings } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [bookingState, setBookingState] = useState<'idle'|'loading'|'success'>('idle');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reflectionQ1, setReflectionQ1] = useState('');
  const [reflectionQ2, setReflectionQ2] = useState<'yes' | 'maybe' | 'no'>('maybe');
  const [reflectionQ3, setReflectionQ3] = useState('');

  const exp = getExperience(id as string);
  const host = exp ? getHost(exp.hostId) : null;
  const village = exp ? getVillage(exp.villageId) : null;

  if (!exp || !host || !village || !personality) {
    return <div className="p-8 text-center text-text-2">Loading or not found...</div>;
  }

  const matchPct = percentageMatch(personality.vector, exp.personalityWeights);

  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getCalendarLabel = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|macintosh|mac os x/.test(ua)) return 'Add to Apple Calendar';
    if (/android/.test(ua)) return 'Add to Android Calendar';
    if (/windows/.test(ua)) return 'Add to Outlook Calendar';
    return 'Add to Calendar';
  };

  const parseDurationMinutes = (durationRaw: string): number => {
    const duration = String(durationRaw ?? '').trim();
    const hourMatch = duration.match(/(\d+)\s*h/i);
    if (hourMatch) return Math.max(30, Number(hourMatch[1]) * 60);
    const dayMatch = duration.match(/(\d+)\s*d/i);
    if (dayMatch) return Math.max(60, Number(dayMatch[1]) * 24 * 60);
    return 120;
  };

  const openCalendarEventForDate = (start: Date) => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
    const isWindows = /windows/.test(ua);

    const end = new Date(start.getTime() + parseDurationMinutes(exp.duration) * 60 * 1000);

    const title = `${exp.name} - WanderGraph`;
    const location = `${village.name}, ${village.region}`;
    const details = `${exp.description}\n\nHost: ${host.name}`;

    const toGoogleStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const startStamp = toGoogleStamp(start);
    const endStamp = toGoogleStamp(end);

    if (isWindows) {
      const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
      outlookUrl.searchParams.set('path', '/calendar/action/compose');
      outlookUrl.searchParams.set('rru', 'addevent');
      outlookUrl.searchParams.set('subject', title);
      outlookUrl.searchParams.set('startdt', start.toISOString());
      outlookUrl.searchParams.set('enddt', end.toISOString());
      outlookUrl.searchParams.set('body', details);
      outlookUrl.searchParams.set('location', location);
      window.open(outlookUrl.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    if (isAndroid) {
      const googleUrl = new URL('https://calendar.google.com/calendar/render');
      googleUrl.searchParams.set('action', 'TEMPLATE');
      googleUrl.searchParams.set('text', title);
      googleUrl.searchParams.set('dates', `${startStamp}/${endStamp}`);
      googleUrl.searchParams.set('details', details);
      googleUrl.searchParams.set('location', location);
      window.open(googleUrl.toString(), '_blank', 'noopener,noreferrer');
      return;
    }

    if (isIOS || isMac) {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//WanderGraph//Booking//EN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@wandergraph`,
        `DTSTAMP:${startStamp}`,
        `DTSTART:${startStamp}`,
        `DTEND:${endStamp}`,
        `SUMMARY:${title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
        `LOCATION:${location.replace(/\n/g, ' ')}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${exp.id}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      return;
    }

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', title);
    googleUrl.searchParams.set('dates', `${startStamp}/${endStamp}`);
    googleUrl.searchParams.set('details', details);
    googleUrl.searchParams.set('location', location);
    window.open(googleUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const openDatePicker = () => {
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 1);
    defaultStart.setHours(10, 0, 0, 0);
    setScheduledAt(toLocalInputValue(defaultStart));
    setShowDatePicker(true);
  };

  const confirmCalendarDate = () => {
    if (!scheduledAt) return;
    const selected = new Date(scheduledAt);
    if (Number.isNaN(selected.getTime())) return;

    if (selected.getTime() < Date.now()) {
      setShowDatePicker(false);
      setShowReflection(true);
      return;
    }

    openCalendarEventForDate(selected);
    setShowDatePicker(false);
  };

  const submitReflection = () => {
    // Local capture for now; can be sent to backend in a follow-up.
    console.log('experience_reflection', {
      experienceId: exp.id,
      villageId: village.id,
      when: scheduledAt,
      q1: reflectionQ1,
      q2: reflectionQ2,
      q3: reflectionQ3,
    });
    setShowReflection(false);
  };

  const handleBook = async () => {
    setBookingState('loading');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceId: exp.id, amount: exp.price })
      });
      const data = await res.json();
      
      setBookingResult(data);
      setBookingState('success');

      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      // Update global state
      addBooking({
        id: data.bookingId,
        experienceId: exp.id,
        villageName: village.name,
        experienceName: exp.name,
        hostName: host.name,
        amount: exp.price,
        split: data.split,
        timestamp: now,
        cwsDelta: data.cwsDelta
      });
      addPoints(data.points);

      // Check badges
      if (village.cws < 45) addBadge('Pioneer');
      if (exp.type === 'volunteer') addBadge('Guardian');
      if (exp.type === 'hike') addBadge('Achiever');

      const socialCount = bookings.filter(b => b.experienceName.includes('Ceremony') || b.experienceName.includes('Cooking')).length;
      if (socialCount >= 1 && (exp.type === 'ceremony' || exp.type === 'cooking')) addBadge('Connector');

      // Trailblazer: visited 3+ different regions (including this booking)
      const visitedVillageNames = new Set([...bookings.map(b => b.villageName), village.name]);
      const visitedRegions = new Set(
        VILLAGES.filter(v => visitedVillageNames.has(v.name)).map(v => v.region)
      );
      if (visitedRegions.size >= 3) addBadge('Trailblazer');

    } catch (e) {
      console.error(e);
      setBookingState('idle');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto px-4 py-6 md:py-10 pb-32"
    >
      <button onClick={() => router.back()} className="text-text-2 hover:text-white mb-8 text-sm flex items-center gap-2">
        ← Back to map
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] px-3 py-1 rounded-pill bg-surface-2 border border-[#333] text-text-2 capitalize">
          {exp.type}
        </span>
        <span className="text-[10px] px-3 py-1 rounded-pill bg-accent/20 border border-accent text-accent font-bold">
          {matchPct}% Match
        </span>
      </div>

      <h1 className="font-display text-4xl md:text-5xl text-white leading-[1.1] mb-4">{exp.name}</h1>
      <div className="text-text-2 text-base flex items-center gap-2 mb-6">
        <span>📍</span> {village.name}, {village.region}
      </div>

      <div className="flex items-center gap-4 text-sm text-text-2 mb-10 bg-surface border border-[#222] rounded-card p-4 inline-flex">
        <span className="text-white font-medium">€{exp.price}</span>
        <span className="w-1 h-1 rounded-full bg-[#444]" />
        <span>⏱ {exp.duration}</span>
        <span className="w-1 h-1 rounded-full bg-[#444]" />
        <span className="text-amber">⭐ {host.rating}</span>
      </div>

      {/* Host Card */}
      <div className="bg-surface border border-[#222] rounded-card p-5 flex gap-4 mb-10 items-center hover:border-[#333] transition-colors">
        <div className="w-12 h-12 rounded-full bg-accent text-black flex items-center justify-center text-lg font-bold shrink-0">
          {host.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="text-text-3 text-[11px] uppercase mb-1">Your host</div>
          <div className="text-white font-medium text-base mb-1">{host.name}</div>
          <div className="text-text-2 text-sm italic">{host.bio}</div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-12">
        <h2 className="font-display text-[22px] text-white mb-4">The experience</h2>
        <p className="font-sans text-base text-text-2 leading-relaxed">{exp.description}</p>
      </div>

      {/* Personality Match */}
      <div className="mb-12">
        <div className="text-text-3 uppercase text-[11px] mb-6">Why this matches you</div>
        <div className="flex flex-col gap-4">
          {PERSONALITIES.map((p, i) => {
            const expWeight = exp.personalityWeights[i];
            const userWeight = personality.vector[i];
            const color = PERSONALITY_INFO[p].color;
            
            return (
              <div key={p} className="flex items-center gap-4">
                <div className="w-24 text-xs text-text-2 flex items-center gap-2">
                  <span>{PERSONALITY_INFO[p].emoji}</span> {p}
                </div>
                <div className="flex-1 h-2 bg-surface-2 rounded-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 opacity-30" style={{ width: `${expWeight * 100}%`, backgroundColor: color }} />
                  <div className="absolute top-0 bottom-0 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] z-10" style={{ left: `calc(${userWeight * 100}% - 3px)`, backgroundColor: color }} />
                </div>
                <div className="w-10 text-right text-xs font-medium" style={{ color }}>
                  {Math.round(expWeight * 100)}%
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-text-3 text-xs mt-6 text-center italic">
          {personality.dominant} travelers rate this {matchPct}% compatible
        </p>
      </div>

      {/* Village Context */}
      <div className="bg-surface border border-[#222] rounded-card p-5 mb-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-display text-xl text-white">{village.name}</h3>
          <div className="text-2xl font-bold" style={{ color: cwsColor(village.cws) }}>{village.cws}</div>
        </div>
        <div className="w-full h-1.5 bg-[#222] rounded-full mb-6 overflow-hidden">
          <div className="h-full" style={{ width: `${village.cws}%`, backgroundColor: cwsColor(village.cws) }} />
        </div>
        <p className="text-sm text-text-2 mb-4">{village.description}</p>
        <p className="text-[10px] text-text-3 uppercase">CWS: Community Wellbeing Score — measures economic + cultural health</p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-auto bg-[#080808F0] md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-[#222] md:border-none p-4 md:p-0 z-40 flex justify-between items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">€{exp.price}</span>
          <span className="text-text-2 text-sm">/person</span>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-accent text-black font-semibold px-8 py-3.5 rounded-pill hover:bg-accent-dim active:scale-[0.97] transition-all"
        >
          Book this experience
        </button>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-[#333] rounded-card p-6 w-full max-w-sm flex flex-col"
            >
              {bookingState === 'idle' && (
                <>
                  <h2 className="font-display text-2xl text-white mb-2">Confirm booking</h2>
                  <p className="text-text-2 text-sm mb-6">{exp.name} in {village.name}</p>
                  
                  <div className="bg-surface-2 rounded-lg p-4 mb-6">
                    <div className="text-xs text-text-3 uppercase mb-3">Your €{exp.price} will be distributed:</div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-2">Host (70%)</span>
                      <span className="text-accent font-medium">€{(exp.price * 0.7).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-2">Community (15%)</span>
                      <span className="text-amber">€{(exp.price * 0.15).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-2">Culture (10%)</span>
                      <span className="text-blue-400">€{(exp.price * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-2">Platform (5%)</span>
                      <span className="text-text-3">€{(exp.price * 0.05).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowModal(false)} className="flex-1 border border-[#333] text-text-2 rounded-pill py-3 hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleBook} className="flex-1 bg-accent text-black font-medium rounded-pill py-3 hover:bg-accent-dim transition-colors">Confirm →</button>
                  </div>
                </>
              )}

              {bookingState === 'loading' && (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-[#333] border-t-accent rounded-full animate-spin mb-4" />
                  <p className="text-text-2">Processing impact...</p>
                </div>
              )}

              {bookingState === 'success' && bookingResult && (
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl mb-4">✓</div>
                  <h2 className="font-display text-2xl text-white mb-2">Booked! You made an impact.</h2>
                  <p className="text-accent font-medium mb-8">+{bookingResult.cwsDelta} CWS for {village.name}</p>
                  <div className="w-full rounded-lg border border-[#333] bg-surface-2 p-4 mb-4 text-left">
                    <p className="text-sm text-white font-medium mb-3">Add this booking to your calendar?</p>
                    <button
                      onClick={openDatePicker}
                      className="w-full rounded-pill bg-[#0B6E2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#095A22] transition-colors"
                    >
                      {getCalendarLabel()}
                    </button>
                  </div>
                  <button onClick={() => router.push('/impact')} className="w-full bg-accent text-black font-medium rounded-pill py-3 hover:bg-accent-dim transition-colors">
                    View impact →
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              className="bg-surface border border-[#333] rounded-card p-6 w-full max-w-sm"
            >
              <h3 className="font-display text-2xl text-white mb-2">Choose experience date</h3>
              <p className="text-sm text-text-2 mb-4">Pick when you plan to do this experience.</p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                aria-label="Experience date and time"
                title="Experience date and time"
                className="w-full rounded-lg border border-[#333] bg-surface-2 px-3 py-2 text-sm text-white"
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 rounded-pill border border-[#3A3A3A] px-4 py-2 text-sm text-text-2 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCalendarDate}
                  className="flex-1 rounded-pill bg-[#0B6E2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#095A22] transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReflection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              className="bg-surface border border-[#333] rounded-card p-6 w-full max-w-md"
            >
              <h3 className="font-display text-2xl text-white mb-2">Quick reflection</h3>
              <p className="text-sm text-text-2 mb-4">That date is in the past. Answer these quick questions instead.</p>

              <label className="block text-xs text-text-3 uppercase mb-2">How did it go?</label>
              <textarea
                value={reflectionQ1}
                onChange={(e) => setReflectionQ1(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-surface-2 px-3 py-2 text-sm text-white mb-3"
                rows={3}
                placeholder="Share your experience"
              />

              <label className="block text-xs text-text-3 uppercase mb-2">Would you recommend it?</label>
              <select
                value={reflectionQ2}
                onChange={(e) => setReflectionQ2(e.target.value as 'yes' | 'maybe' | 'no')}
                aria-label="Would you recommend this experience"
                title="Would you recommend this experience"
                className="w-full rounded-lg border border-[#333] bg-surface-2 px-3 py-2 text-sm text-white mb-3"
              >
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>

              <label className="block text-xs text-text-3 uppercase mb-2">One tip for future travelers</label>
              <textarea
                value={reflectionQ3}
                onChange={(e) => setReflectionQ3(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-surface-2 px-3 py-2 text-sm text-white"
                rows={2}
                placeholder="What should they know?"
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowReflection(false)}
                  className="flex-1 rounded-pill border border-[#3A3A3A] px-4 py-2 text-sm text-text-2 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={submitReflection}
                  className="flex-1 rounded-pill bg-[#0B6E2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#095A22] transition-colors"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
