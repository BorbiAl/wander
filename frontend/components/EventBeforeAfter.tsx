type EventBeforeAfterProps = {
  title?: string;
  before: string[];
  after: string[];
  compact?: boolean;
};

function formatEventLabel(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function EventBeforeAfter({
  title = 'Events timeline',
  before,
  after,
  compact = false,
}: EventBeforeAfterProps) {
  const beforeCount = before.length;
  const afterCount = after.length;
  const total = beforeCount + afterCount;
  const beforePct = total > 0 ? Math.round((beforeCount / total) * 100) : 0;
  const afterPct = total > 0 ? 100 - beforePct : 0;

  const panelClass = compact
    ? 'rounded-[16px] border border-[#D6DCCD]/40 bg-[#E5E9DF]/60 p-4'
    : 'rounded-[24px] border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl';

  const titleClass = compact
    ? 'text-[11px] font-bold uppercase tracking-widest text-[#1A2E1C]/45 mb-3'
    : 'text-[12px] font-bold uppercase tracking-widest text-[#1A2E1C]/45 mb-4';

  const listClass = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div className={panelClass}>
      <p className={titleClass}>{title}</p>

      <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-[#D6DCCD]/60">
        <div className="flex h-full w-full">
          <div
            className="h-full bg-[#B45309] transition-all"
            style={{ width: `${beforePct}%` }}
            title={`Before: ${beforeCount}`}
          />
          <div
            className="h-full bg-[#0B6E2A] transition-all"
            style={{ width: `${afterPct}%` }}
            title={`After: ${afterCount}`}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#D6DCCD]/50 bg-white/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">Before</p>
          <p className="text-2xl font-bold tracking-tighter text-[#B45309]">{beforeCount}</p>
        </div>
        <div className="rounded-xl border border-[#D6DCCD]/50 bg-white/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">After</p>
          <p className="text-2xl font-bold tracking-tighter text-[#0B6E2A]">{afterCount}</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-[#1A2E1C]/45">No events tracked yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">Before list</p>
            <div className={`max-h-24 overflow-auto ${listClass} text-[#1A2E1C]/60`}>
              {beforeCount === 0 ? (
                <p>None</p>
              ) : (
                <ul className="space-y-1">
                  {before.slice(0, 6).map((item, index) => (
                    <li key={`before-${item}-${index}`} className="truncate">{formatEventLabel(item)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40">After list</p>
            <div className={`max-h-24 overflow-auto ${listClass} text-[#1A2E1C]/60`}>
              {afterCount === 0 ? (
                <p>None</p>
              ) : (
                <ul className="space-y-1">
                  {after.slice(0, 6).map((item, index) => (
                    <li key={`after-${item}-${index}`} className="truncate">{formatEventLabel(item)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
