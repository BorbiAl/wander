'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { getExperience, getHost, getVillage, percentageMatch, cwsColor } from '@/app/lib/utils';
import { PERSONALITIES, PERSONALITY_INFO, VILLAGES, patchDataArrays } from '@/app/lib/data';

export default function ExperiencePage() {
  const { id } = useParams();
  const router = useRouter();
<<<<<<< Updated upstream
  const { personality, addBooking, addPoints, addBadge, bookings, seedStatus, destination } = useApp();

=======
  const { personality, addBooking, updateBooking, addPoints, addBadge, bookings } = useApp();
  
>>>>>>> Stashed changes
  const [showModal, setShowModal] = useState(false);
  const [bookingState, setBookingState] = useState<'date'|'confirm'|'loading'|'success'>('date');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [dateYear, setDateYear] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const [reflectionQ1, setReflectionQ1] = useState('');
  const [reflectionQ2, setReflectionQ2] = useState<'yes' | 'maybe' | 'no'>('maybe');
  const [reflectionQ3, setReflectionQ3] = useState('');
  const [seeded, setSeeded] = useState(false);

  // If data arrays are empty but we have a destination, re-seed before rendering
  useEffect(() => {
    if (getExperience(id as string)) { setSeeded(true); return; }
    if (destination && seedStatus === 'done') {
      fetch(`/api/seed?location=${encodeURIComponent(destination)}`)
        .then(r => r.json())
        .then(data => {
          patchDataArrays(data);
          setSeeded(true);
        })
        .catch(() => setSeeded(true));
    } else {
      setSeeded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exp = getExperience(id as string);
  const host = exp ? getHost(exp.hostId) : null;
  const village = exp ? getVillage(exp.villageId) : null;

  if (!seeded || seedStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D6DCCD] border-t-[#0B6E2A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!exp || !host || !village) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-[#1A2E1C]/60 font-medium">Experience not found.</p>
        <button onClick={() => router.back()} className="text-[13px] font-bold uppercase tracking-widest text-[#0B6E2A] hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  const matchPct = personality ? percentageMatch(personality.vector, exp.personalityWeights) : 0;

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

  const openModal = () => {
    setDateMonth('');
    setDateDay('');
    setDateYear('');
    setScheduledAt('');
    setBookingState('date');
    setBookingResult(null);
    setShowModal(true);
  };

  const maxDaysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();

  const buildScheduledAt = (m: string, d: string, y: string): string => {
    const mm = parseInt(m), dd = parseInt(d), yyyy = parseInt(y);
    if (!mm || !dd || !yyyy || yyyy < 2026) return '';
    if (mm < 1 || mm > 12) return '';
    if (dd < 1 || dd > maxDaysInMonth(mm, yyyy)) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${yyyy}-${pad(mm)}-${pad(dd)}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(dateStr + 'T12:00') <= today) return '';
    return dateStr;
  };

  const handleMonthChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    setDateMonth(digits);
    const n = parseInt(digits);
    if (digits.length === 2 || (digits.length === 1 && n > 1)) {
      dayRef.current?.focus();
    }
    setScheduledAt(buildScheduledAt(digits, dateDay, dateYear));
  };

  const handleDayChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    setDateDay(digits);
    const n = parseInt(digits);
    if (digits.length === 2 || (digits.length === 1 && n > 3)) {
      yearRef.current?.focus();
    }
    setScheduledAt(buildScheduledAt(dateMonth, digits, dateYear));
  };

  const handleYearChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setDateYear(digits);
    setScheduledAt(buildScheduledAt(dateMonth, dateDay, digits));
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

      const now = Date.now();
      addBooking({
        id: data.bookingId,
        experienceId: exp.id,
        villageName: village.name,
        experienceName: exp.name,
        hostName: host.name,
        amount: exp.price,
        split: data.split,
        timestamp: now,
        cwsDelta: data.cwsDelta,
        scheduledAt: scheduledAt || undefined,
        eventsBefore: [],
        eventsAfter: [],
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
      setBookingState('confirm');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-4xl mx-auto px-5 py-8 md:py-12 pb-32 font-sans text-[#1A2E1C]"
    >
      <button onClick={() => router.back()} className="text-[#1A2E1C]/60 hover:text-[#1A2E1C] mb-8 text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
        ← Back to map
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] px-3 py-1 rounded-full bg-white/60 backdrop-blur-md border border-white/50 text-[#1A2E1C]/70 shadow-sm font-bold tracking-widest capitalize">
          {exp.type}
        </span>
        <span className="text-[10px] px-3 py-1 rounded-full bg-[#0B6E2A]/10 border border-[#0B6E2A]/20 text-[#0B6E2A] font-bold">
          {matchPct}% Match
        </span>
      </div>

      <h1 className="font-bold tracking-tighter text-4xl md:text-6xl text-[#1A2E1C] leading-[1.05] mb-4">{exp.name}</h1>
      <div className="text-[#1A2E1C]/60 text-[15px] sm:text-lg flex items-center gap-2 font-medium tracking-tight mb-6">
        <span>📍</span> {village.name}, {village.region}
      </div>

      <div className="flex items-center gap-4 text-[14px] font-semibold tracking-wide text-[#1A2E1C]/70 mb-10 bg-white/60 backdrop-blur-md border border-white/50 rounded-[24px] shadow-sm hover:shadow-md transition-all p-4 inline-flex">
        <span className="text-[#1A2E1C] font-bold">€{exp.price}</span>
        <span className="w-1 h-1 rounded-full bg-[#1A2E1C]/20" />
        <span>⏱ {exp.duration}</span>
        <span className="w-1 h-1 rounded-full bg-[#1A2E1C]/20" />
        <span className="text-[#F5A623] font-bold">⭐ {host.rating}</span>
      </div>

      {/* Host Card */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-[28px] p-6 flex gap-5 mb-12 items-center transition-transform hover:scale-[1.02]">
        <div className="w-12 h-12 rounded-full bg-[#0B6E2A] text-white shadow-md flex items-center justify-center text-lg font-bold shrink-0">
          {host.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="text-[#1A2E1C]/50 text-[10px] font-bold uppercase tracking-widest mb-1">Your host</div>
          <div className="text-[#1A2E1C] font-bold text-base mb-1">{host.name}</div>
          <div className="text-[#1A2E1C]/60 text-sm italic">{host.bio}</div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-12">
        <h2 className="font-display text-[22px] text-[#1A2E1C] mb-4">The experience</h2>
        <p className="font-sans text-base text-[#1A2E1C]/60 leading-relaxed">{exp.description}</p>
      </div>

      {/* Personality Match */}
      {personality && (
      <div className="mb-12">
        <div className="text-text-3 uppercase text-[11px] mb-6">Why this matches you</div>
        <div className="flex flex-col gap-4">
          {PERSONALITIES.map((p, i) => {
            const expWeight = exp.personalityWeights[i];
            const userWeight = personality.vector[i];
            const color = PERSONALITY_INFO[p].color;

            return (
              <div key={p} className="flex items-center gap-4">
                <div className="w-24 text-xs text-[#1A2E1C]/60 flex items-center gap-2">
                  <span>{PERSONALITY_INFO[p].emoji}</span> {p}
                </div>
                <div className="flex-1 h-2 bg-white/90 backdrop-blur-md rounded-full relative overflow-hidden">
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
      )}

      {/* Village Context */}
      <div className="bg-white/90 backdrop-blur-xl border border-[#D6DCCD]/30 rounded-[24px] p-5 mb-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-display text-xl text-[#1A2E1C]">{village.name}</h3>
          <div className="text-2xl font-bold" style={{ color: cwsColor(village.cws) }}>{village.cws}</div>
        </div>
        <div className="w-full h-1.5 bg-[#1A2E1C]/10 rounded-full mb-6 overflow-hidden">
          <div className="h-full" style={{ width: `${village.cws}%`, backgroundColor: cwsColor(village.cws) }} />
        </div>
        <p className="text-sm text-[#1A2E1C]/60 mb-4">{village.description}</p>
        <p className="text-[10px] text-text-3 uppercase">CWS: Community Wellbeing Score — measures economic + cultural health</p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-auto bg-[#080808F0] md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-[rgba(0,0,0,0.05)] md:border-none p-4 md:p-0 z-40 flex justify-between items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[#1A2E1C]">€{exp.price}</span>
          <span className="text-[#1A2E1C]/60 text-sm">/person</span>
        </div>
        <button
          onClick={openModal}
          className="bg-[#0B6E2A] text-white shadow-md font-semibold px-8 py-3.5 rounded-full hover:bg-[#0B6E2A]-dim active:scale-[0.97] transition-all"
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
              className="bg-white/90 backdrop-blur-xl border border-[#D6DCCD]/40 rounded-[24px] p-6 w-full max-w-sm flex flex-col"
            >
              {bookingState === 'date' && (
                <>
                  <h2 className="font-display text-2xl text-[#1A2E1C] mb-1">When do you want to go?</h2>
                  <p className="text-[#1A2E1C]/50 text-sm mb-6">{exp.name} · {village.name}</p>
                  <div className="flex gap-2 mb-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">Month</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        value={dateMonth}
                        onChange={e => handleMonthChange(e.target.value)}
                        maxLength={2}
                        className="w-full rounded-xl border border-[#D6DCCD]/60 bg-white px-3 py-3 text-lg font-bold text-center text-[#1A2E1C] focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">Day</label>
                      <input
                        ref={dayRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="DD"
                        value={dateDay}
                        onChange={e => handleDayChange(e.target.value)}
                        maxLength={2}
                        className="w-full rounded-xl border border-[#D6DCCD]/60 bg-white px-3 py-3 text-lg font-bold text-center text-[#1A2E1C] focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-[1.4]">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">Year</label>
                      <input
                        ref={yearRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="2026"
                        value={dateYear}
                        onChange={e => handleYearChange(e.target.value)}
                        maxLength={4}
                        className="w-full rounded-xl border border-[#D6DCCD]/60 bg-white px-3 py-3 text-lg font-bold text-center text-[#1A2E1C] focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
                      />
                    </div>
                  </div>
                  {scheduledAt && (
                    <p className="text-[#0B6E2A] text-xs font-semibold text-center mb-4">
                      {new Date(scheduledAt + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => { setScheduledAt(''); setBookingState('confirm'); }} className="flex-1 border border-[#D6DCCD]/40 text-[#1A2E1C]/50 rounded-full py-3 text-sm hover:text-[#1A2E1C] transition-colors">Skip</button>
                    <button type="button" onClick={() => setBookingState('confirm')} disabled={!!dateMonth && !!dateDay && !!dateYear && !scheduledAt} className="flex-1 bg-[#0B6E2A] text-white shadow-md font-medium rounded-full py-3 text-sm transition-colors disabled:opacity-40">Next →</button>
                  </div>
                </>
              )}

              {bookingState === 'confirm' && (
                <>
                  <h2 className="font-display text-2xl text-[#1A2E1C] mb-1">Confirm booking</h2>
                  <p className="text-[#1A2E1C]/60 text-[15px] font-medium tracking-tight mb-2">{exp.name} in {village.name}</p>
                  {scheduledAt && (
                    <p className="text-[#0B6E2A] text-xs font-semibold mb-6">
                      📅 {new Date(scheduledAt + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}

                  <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 mb-6">
                    <div className="text-xs text-text-3 uppercase mb-3">Your €{exp.price} will be distributed:</div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#1A2E1C]/60">Host (70%)</span>
                      <span className="text-[#0B6E2A] font-medium">€{(exp.price * 0.7).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#1A2E1C]/60">Community (15%)</span>
                      <span className="text-[#F5A623] font-bold">€{(exp.price * 0.15).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#1A2E1C]/60">Culture (10%)</span>
                      <span className="text-blue-400">€{(exp.price * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#1A2E1C]/60">Platform (5%)</span>
                      <span className="text-text-3">€{(exp.price * 0.05).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBookingState('date')} className="flex-1 border border-[#D6DCCD]/40 text-[#1A2E1C]/60 rounded-full py-3 hover:text-[#1A2E1C] transition-colors">← Back</button>
                    <button type="button" onClick={handleBook} className="flex-1 bg-[#0B6E2A] text-white shadow-md font-medium rounded-full py-3 hover:bg-[#095A22] transition-colors">Confirm →</button>
                  </div>
                </>
              )}

              {bookingState === 'loading' && (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-[#D6DCCD]/40 border-t-[#0B6E2A] rounded-full animate-spin mb-4" />
                  <p className="text-[#1A2E1C]/60">Processing impact...</p>
                </div>
              )}

              {bookingState === 'success' && bookingResult && (
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0B6E2A]/20 text-[#0B6E2A] flex items-center justify-center text-3xl mb-4">✓</div>
                  <h2 className="font-display text-2xl text-[#1A2E1C] mb-2">Booked! You made an impact.</h2>
                  <p className="text-[#0B6E2A] font-medium mb-2">+{bookingResult.cwsDelta} CWS for {village.name}</p>
                  {scheduledAt && (
                    <p className="text-[#1A2E1C]/50 text-xs mb-6">
                      📅 {new Date(scheduledAt + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {scheduledAt && (
                    <div className="w-full rounded-lg border border-[#D6DCCD]/40 bg-white/90 backdrop-blur-md p-4 mb-4 text-left">
                      <p className="text-sm text-[#1A2E1C] font-bold mb-3">Add to your calendar?</p>
                      <button
                        type="button"
                        onClick={() => openCalendarEventForDate(new Date(scheduledAt + 'T12:00'))}
                        className="w-full rounded-full bg-[#0B6E2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#095A22] transition-colors"
                      >
                        {getCalendarLabel()}
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => router.push('/impact')} className="w-full bg-[#0B6E2A] text-white shadow-md font-medium rounded-full py-3 hover:bg-[#095A22] transition-colors">
                    View impact →
                  </button>
                </div>
              )}
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
              className="bg-white/90 backdrop-blur-xl border border-[#D6DCCD]/40 rounded-[24px] p-6 w-full max-w-md"
            >
              <h3 className="font-display text-2xl text-[#1A2E1C] mb-2">Quick reflection</h3>
              <p className="text-sm text-[#1A2E1C]/60 mb-4">That date is in the past. Answer these quick questions instead.</p>

              <label className="block text-xs text-text-3 uppercase mb-2">How did it go?</label>
              <textarea
                value={reflectionQ1}
                onChange={(e) => setReflectionQ1(e.target.value)}
                className="w-full rounded-lg border border-[#D6DCCD]/40 bg-white/90 backdrop-blur-md px-3 py-2 text-sm text-[#1A2E1C] mb-3"
                rows={3}
                placeholder="Share your experience"
              />

              <label className="block text-xs text-text-3 uppercase mb-2">Would you recommend it?</label>
              <select
                value={reflectionQ2}
                onChange={(e) => setReflectionQ2(e.target.value as 'yes' | 'maybe' | 'no')}
                aria-label="Would you recommend this experience"
                title="Would you recommend this experience"
                className="w-full rounded-lg border border-[#D6DCCD]/40 bg-white/90 backdrop-blur-md px-3 py-2 text-sm text-[#1A2E1C] mb-3"
              >
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>

              <label className="block text-xs text-text-3 uppercase mb-2">One tip for future travelers</label>
              <textarea
                value={reflectionQ3}
                onChange={(e) => setReflectionQ3(e.target.value)}
                className="w-full rounded-lg border border-[#D6DCCD]/40 bg-white/90 backdrop-blur-md px-3 py-2 text-sm text-[#1A2E1C]"
                rows={2}
                placeholder="What should they know?"
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowReflection(false)}
                  className="flex-1 rounded-full border border-[#3A3A3A] px-4 py-2 text-sm text-[#1A2E1C]/60 hover:text-[#1A2E1C] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={submitReflection}
                  className="flex-1 rounded-full bg-[#0B6E2A] px-4 py-2 text-sm font-medium text-[#1A2E1C] hover:bg-[#095A22] transition-colors"
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
