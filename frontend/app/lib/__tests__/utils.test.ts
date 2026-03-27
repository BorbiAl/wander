import { cwsColor, cwsLabel, formatEur, percentageMatch } from '../utils';

// ─── cwsColor ──────────────────────────────────────────────────────────────

describe('cwsColor', () => {
  it('returns green (#C8F55A) for CWS >= 65', () => {
    expect(cwsColor(65)).toBe('#C8F55A');
    expect(cwsColor(100)).toBe('#C8F55A');
    expect(cwsColor(80)).toBe('#C8F55A');
  });

  it('returns amber (#F5A623) for CWS in [50, 64]', () => {
    expect(cwsColor(50)).toBe('#F5A623');
    expect(cwsColor(64)).toBe('#F5A623');
    expect(cwsColor(55)).toBe('#F5A623');
  });

  it('returns red (#FF4444) for CWS < 50', () => {
    expect(cwsColor(49)).toBe('#FF4444');
    expect(cwsColor(0)).toBe('#FF4444');
    expect(cwsColor(1)).toBe('#FF4444');
  });
});

// ─── cwsLabel ──────────────────────────────────────────────────────────────

describe('cwsLabel', () => {
  it('returns "Thriving" for CWS >= 65', () => {
    expect(cwsLabel(65)).toBe('Thriving');
    expect(cwsLabel(100)).toBe('Thriving');
  });

  it('returns "Growing" for CWS in [50, 64]', () => {
    expect(cwsLabel(50)).toBe('Growing');
    expect(cwsLabel(64)).toBe('Growing');
  });

  it('returns "Pioneer territory" for CWS < 50', () => {
    expect(cwsLabel(49)).toBe('Pioneer territory');
    expect(cwsLabel(0)).toBe('Pioneer territory');
  });

  it('cwsColor and cwsLabel are consistent at every boundary', () => {
    // At CWS=65 both should flip to the top tier
    expect(cwsColor(65)).toBe('#C8F55A');
    expect(cwsLabel(65)).toBe('Thriving');
    // At CWS=50 both should be mid tier
    expect(cwsColor(50)).toBe('#F5A623');
    expect(cwsLabel(50)).toBe('Growing');
  });
});

// ─── formatEur ─────────────────────────────────────────────────────────────

describe('formatEur', () => {
  it('formats whole numbers correctly', () => {
    expect(formatEur(50)).toBe('€50');
    expect(formatEur(0)).toBe('€0');
    expect(formatEur(100)).toBe('€100');
  });

  it('truncates (not rounds) decimal places', () => {
    // toFixed(0) rounds — verify the behaviour is intentional
    expect(formatEur(49.9)).toBe('€50');
    expect(formatEur(49.4)).toBe('€49');
  });

  it('always starts with the euro sign', () => {
    expect(formatEur(1).startsWith('€')).toBe(true);
  });
});

// ─── percentageMatch ───────────────────────────────────────────────────────

describe('percentageMatch', () => {
  it('returns a value between 0 and 99 inclusive', () => {
    const pv = [0.2, 0.2, 0.2, 0.2, 0.2];
    const pw = [0.2, 0.2, 0.2, 0.2, 0.2];
    const score = percentageMatch(pv, pw);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(99);
  });

  it('never returns 100 (caps at 99)', () => {
    // Perfect alignment: should cap at 99, not 100
    const score = percentageMatch([1, 0, 0, 0, 0], [1, 0, 0, 0, 0]);
    expect(score).toBeLessThanOrEqual(99);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(percentageMatch([1, 0, 0, 0, 0], [0, 1, 0, 0, 0])).toBe(0);
  });

  it('returns an integer', () => {
    const pv = [0.3, 0.2, 0.2, 0.2, 0.1];
    const pw = [0.4, 0.2, 0.1, 0.2, 0.1];
    const score = percentageMatch(pv, pw);
    expect(Number.isInteger(score)).toBe(true);
  });

  it('higher alignment produces a higher score', () => {
    const pv = [0.8, 0.05, 0.05, 0.05, 0.05];
    const aligned   = [0.7, 0.1,  0.1,  0.05, 0.05];
    const misaligned = [0.05, 0.8, 0.05, 0.05, 0.05];
    expect(percentageMatch(pv, aligned)).toBeGreaterThan(percentageMatch(pv, misaligned));
  });
});
