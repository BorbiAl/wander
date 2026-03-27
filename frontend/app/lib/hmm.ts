// HMM-based personality inference — pure TypeScript, no external deps.
// Mirrors the reference Python implementation in /hmm/.

export type PersonalityResult = {
  vector: [number, number, number, number, number]; // sums to 1
  dominant: string;
  dominantIndex: number;
};

// ─── Model dimensions ──────────────────────────────────────────────────────

/** Number of hidden states (personality archetypes). */
const N_STATES = 5;

/**
 * Number of distinct observation symbols produced by the 15-step quiz:
 *   0–3   SwipeCard choices      (image pair, 4 questions × 2 options = 8 cols, 0–7 but mapped to 0–3 offsets per q)
 *   0–11  Image-pair observations (steps 1–4, columns 0–11)
 *  12–17  Audio-reaction observations (steps 5–7, columns 12–17)
 *  18–20  Scroll-card observations (steps 8–10, columns 18–20)
 *  21–23  Emoji-scenario observations (steps 11–14, columns 21–23)
 * Total: 24 observation types.
 */
const N_OBS = 24;

/**
 * Scaling factor applied after the dot-product match to stretch the
 * [0, ~0.29] raw output into the more useful [0, 1] range.
 * Derived empirically: maximum possible dot product of two L1-normalised
 * 5-vectors ≈ 0.286, so 3.5 × 0.286 ≈ 1.0.
 */
const MATCH_SCALE_FACTOR = 3.5;

// ─── Personality archetype labels ──────────────────────────────────────────

const ARCHETYPE_LABELS = ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian'] as const;

// ─── Emission matrix B [N_STATES × N_OBS] ─────────────────────────────────
//
// B[state][obs] = P(observation | state).
// Each row sums to ≈ 1 (slight rounding is intentional).
//
// Column legend (observation index → meaning):
//  0  img: wilderness chosen     1  img: marked trail chosen
//  2  img: crowd chosen          3  img: solitude chosen
//  4  img: fast pace chosen      5  img: slow pace chosen
//  6  img: tourist hub chosen    7  img: off-beaten path chosen
//  8  img: summit / challenge    9  img: easy / accessible
// 10  img: volunteer / green    11  img: cultural artifact
// 12  audio: festival / energy  13  audio: forest / silence
// 14  audio: upbeat / social    15  audio: challenge / drive
// 16  audio: calm / reflective  17  audio: nature / ambient
// 18  scroll: expedition type   19  scroll: village / slow type
// 20  scroll: eco / restore type
// 21  emoji: adventure / bold   22  emoji: social / connect
// 23  emoji: calm / nature
//
const B: number[][] = [
  // Explorer — wilderness, solitude, speed, challenge
  [0.12,0.02, 0.10,0.01, 0.08,0.02, 0.10,0.01, 0.09,0.01, 0.02,0.07, 0.01,0.08,0.02, 0.09,0.01,0.03, 0.01,0.08,0.03, 0.04,0.08,0.02],
  // Connector — festivals, groups, food, people
  [0.01,0.10, 0.01,0.09, 0.01,0.08, 0.01,0.10, 0.01,0.09, 0.07,0.01, 0.02,0.01,0.11, 0.02,0.08,0.02, 0.04,0.02,0.08, 0.10,0.01,0.07],
  // Restorer — hermitage, silence, slow reads, nature
  [0.02,0.05, 0.09,0.02, 0.08,0.01, 0.02,0.06, 0.02,0.07, 0.01,0.04, 0.10,0.01,0.03, 0.01,0.04,0.09, 0.02,0.10,0.04, 0.03,0.04,0.09],
  // Achiever — summits, deep reads, challenge, fast pace
  [0.03,0.02, 0.01,0.03, 0.01,0.06, 0.02,0.01, 0.10,0.02, 0.01,0.02, 0.01,0.02,0.03, 0.10,0.01,0.04, 0.02,0.03,0.12, 0.02,0.10,0.01],
  // Guardian — reforestation, low budget, volunteer, projects
  [0.01,0.02, 0.01,0.03, 0.01,0.08, 0.02,0.04, 0.01,0.02, 0.07,0.02, 0.02,0.01,0.03, 0.01,0.02,0.06, 0.04,0.01,0.05, 0.03,0.02,0.09],
];

// ─── Transition and initial distribution (uniform — no temporal bias) ──────

const A: number[][] = Array(N_STATES).fill(null).map(() => Array(N_STATES).fill(1 / N_STATES));
const PI: number[] = Array(N_STATES).fill(1 / N_STATES);

// ─── Public API ────────────────────────────────────────────────────────────

export function computePersonality(obs: number[]): PersonalityResult {
  const T = obs.length;
  if (T === 0) {
    const uniform = Array(N_STATES).fill(1 / N_STATES) as [number, number, number, number, number];
    return { vector: uniform, dominant: ARCHETYPE_LABELS[0], dominantIndex: 0 };
  }

  // Clamp observations to valid range so an out-of-range index never
  // silently drives the forward variable to zero.
  const safeObs = obs.map((o) => (Number.isInteger(o) && o >= 0 && o < N_OBS ? o : 0));

  // Forward algorithm: alpha[t][j] = P(o_1…o_t, q_t = j)
  const alpha: number[][] = Array(T).fill(null).map(() => Array(N_STATES).fill(0));

  for (let j = 0; j < N_STATES; j++) {
    alpha[0][j] = PI[j] * (B[j][safeObs[0]] ?? 0.01);
  }

  for (let t = 1; t < T; t++) {
    for (let j = 0; j < N_STATES; j++) {
      let sum = 0;
      for (let i = 0; i < N_STATES; i++) sum += alpha[t - 1][i] * A[i][j];
      alpha[t][j] = sum * (B[j][safeObs[t]] ?? 0.01);
    }
  }

  const final = alpha[T - 1];
  const total = final.reduce((a, b) => a + b, 0) || 1;
  const vector = final.map((v) => v / total) as [number, number, number, number, number];
  const dominantIndex = vector.indexOf(Math.max(...vector));

  return { vector, dominant: ARCHETYPE_LABELS[dominantIndex], dominantIndex };
}

/**
 * Dot-product similarity between a personality vector and an experience's
 * personality weights. Returns a value in [0, 1].
 */
export function matchScore(pv: number[], pw: number[]): number {
  const dot = pv.reduce((sum, v, i) => sum + v * (pw[i] ?? 0), 0);
  return Math.min(1, dot * MATCH_SCALE_FACTOR);
}

/**
 * Compute a group personality vector: arithmetic mean per dimension,
 * L1-normalised so the result is a valid probability vector (sums to 1).
 */
export function computeGroupVector(
  vectors: Array<[number, number, number, number, number]>,
): [number, number, number, number, number] {
  if (vectors.length === 0) {
    return Array(N_STATES).fill(1 / N_STATES) as [number, number, number, number, number];
  }
  const sum = vectors.reduce<number[]>(
    (acc, v) => acc.map((a, i) => a + v[i]),
    Array(N_STATES).fill(0),
  );
  const total = sum.reduce((a, b) => a + b, 0) || 1;
  return sum.map((s) => s / total) as [number, number, number, number, number];
}
