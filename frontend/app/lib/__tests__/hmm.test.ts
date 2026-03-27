import { computePersonality, matchScore, computeGroupVector } from '../hmm';

// ─── computePersonality ────────────────────────────────────────────────────

describe('computePersonality', () => {
  it('returns a uniform vector for empty observations', () => {
    const result = computePersonality([]);
    expect(result.vector).toHaveLength(5);
    result.vector.forEach(v => expect(v).toBeCloseTo(0.2, 5));
    expect(result.dominant).toBe('Explorer');
    expect(result.dominantIndex).toBe(0);
  });

  it('returns a vector that sums to 1', () => {
    const obs = [0, 2, 4, 6, 8, 10, 12, 14, 18, 21]; // explorer-leaning
    const { vector } = computePersonality(obs);
    const sum = vector.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('all vector components are between 0 and 1', () => {
    const obs = [1, 3, 5, 7, 9, 11, 13, 15, 19, 22]; // connector-leaning
    const { vector } = computePersonality(obs);
    vector.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it('explorer-biased observations produce Explorer as dominant', () => {
    // Cols 0, 2, 4, 8 strongly favour Explorer row in B
    const explorerObs = Array(15).fill(0); // observation 0 = wilderness
    const { dominant } = computePersonality(explorerObs);
    expect(dominant).toBe('Explorer');
  });

  it('connector-biased observations produce Connector as dominant', () => {
    // Observation 1 = marked trail, col 14 = upbeat/social — both favour Connector
    const connectorObs = Array(15).fill(14);
    const { dominant } = computePersonality(connectorObs);
    expect(dominant).toBe('Connector');
  });

  it('clamps out-of-range observations instead of crashing', () => {
    expect(() => computePersonality([999, -1, 24, 100])).not.toThrow();
    const { vector } = computePersonality([999, -1, 24, 100]);
    const sum = vector.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('returns the correct dominantIndex matching the dominant label', () => {
    const labels = ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian'];
    const obs = [0, 0, 0, 0, 0];
    const { dominant, dominantIndex, vector } = computePersonality(obs);
    expect(labels[dominantIndex]).toBe(dominant);
    expect(vector[dominantIndex]).toBe(Math.max(...vector));
  });
});

// ─── matchScore ────────────────────────────────────────────────────────────

describe('matchScore', () => {
  it('returns 1 for identical maximum vectors', () => {
    // [1,0,0,0,0] · [1,0,0,0,0] = 1, × 3.5 = 3.5 → clamped to 1
    const score = matchScore([1, 0, 0, 0, 0], [1, 0, 0, 0, 0]);
    expect(score).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    const score = matchScore([1, 0, 0, 0, 0], [0, 1, 0, 0, 0]);
    expect(score).toBe(0);
  });

  it('returns a value in [0, 1] for any valid inputs', () => {
    const pv = [0.5, 0.2, 0.1, 0.1, 0.1];
    const pw = [0.3, 0.3, 0.2, 0.1, 0.1];
    const score = matchScore(pv, pw);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('is higher when vectors are more aligned', () => {
    const pv = [0.8, 0.05, 0.05, 0.05, 0.05];
    const aligned = [0.7, 0.1, 0.1, 0.05, 0.05];
    const misaligned = [0.05, 0.05, 0.05, 0.8, 0.05];
    expect(matchScore(pv, aligned)).toBeGreaterThan(matchScore(pv, misaligned));
  });

  it('handles mismatched array lengths by treating missing weights as 0', () => {
    expect(() => matchScore([0.5, 0.5], [0.5, 0.5, 0.0, 0.0, 0.0])).not.toThrow();
  });
});

// ─── computeGroupVector ────────────────────────────────────────────────────

describe('computeGroupVector', () => {
  it('returns a uniform vector for an empty group', () => {
    const result = computeGroupVector([]);
    result.forEach(v => expect(v).toBeCloseTo(0.2, 5));
  });

  it('returns the input vector unchanged for a single member', () => {
    const v: [number, number, number, number, number] = [0.4, 0.3, 0.1, 0.1, 0.1];
    const result = computeGroupVector([v]);
    result.forEach((val, i) => expect(val).toBeCloseTo(v[i], 5));
  });

  it('averages two identical vectors to the same vector', () => {
    const v: [number, number, number, number, number] = [0.2, 0.2, 0.2, 0.2, 0.2];
    const result = computeGroupVector([v, v]);
    result.forEach(val => expect(val).toBeCloseTo(0.2, 5));
  });

  it('result always sums to 1', () => {
    const vectors: Array<[number, number, number, number, number]> = [
      [0.5, 0.2, 0.1, 0.1, 0.1],
      [0.1, 0.5, 0.2, 0.1, 0.1],
      [0.2, 0.2, 0.3, 0.2, 0.1],
    ];
    const result = computeGroupVector(vectors);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('reflects the dominant dimension of the group', () => {
    // Three members all heavily weighted toward index 2 (Restorer)
    const vectors: Array<[number, number, number, number, number]> = [
      [0.1, 0.1, 0.6, 0.1, 0.1],
      [0.1, 0.1, 0.6, 0.1, 0.1],
      [0.1, 0.1, 0.6, 0.1, 0.1],
    ];
    const result = computeGroupVector(vectors);
    expect(result.indexOf(Math.max(...result))).toBe(2);
  });
});
