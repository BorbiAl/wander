// Simulated HMM — no Python needed for the frontend demo.
// This mirrors what the real Python engine does.

export type PersonalityResult = {
  vector: [number, number, number, number, number]; // sums to 1
  dominant: string;
  dominantIndex: number;
}

// 5x24 emission matrix B — hardcoded to match real HMM params
// Rows: Explorer, Connector, Restorer, Achiever, Guardian
// Cols: 24 observation types (image pairs 0-11, audio 12-17, scroll 18-20, emoji 21-23 -- wait, 24 total 0-23)
const B: number[][] = [
  // Explorer: wilderness, solitude, speed, challenge
  [0.12,0.02, 0.10,0.01, 0.08,0.02, 0.10,0.01, 0.09,0.01, 0.02,0.07, 0.01,0.08,0.02, 0.09,0.01,0.03, 0.01,0.08,0.03, 0.04,0.08,0.02],
  // Connector: festivals, groups, food, people
  [0.01,0.10, 0.01,0.09, 0.01,0.08, 0.01,0.10, 0.01,0.09, 0.07,0.01, 0.02,0.01,0.11, 0.02,0.08,0.02, 0.04,0.02,0.08, 0.10,0.01,0.07],
  // Restorer: hermitage, silence, slow reads, nature
  [0.02,0.05, 0.09,0.02, 0.08,0.01, 0.02,0.06, 0.02,0.07, 0.01,0.04, 0.10,0.01,0.03, 0.01,0.04,0.09, 0.02,0.10,0.04, 0.03,0.04,0.09],
  // Achiever: summits, deep reads, challenge, fast pace
  [0.03,0.02, 0.01,0.03, 0.01,0.06, 0.02,0.01, 0.10,0.02, 0.01,0.02, 0.01,0.02,0.03, 0.10,0.01,0.04, 0.02,0.03,0.12, 0.02,0.10,0.01],
  // Guardian: reforestation, low budget, volunteer, projects
  [0.01,0.02, 0.01,0.03, 0.01,0.08, 0.02,0.04, 0.01,0.02, 0.07,0.02, 0.02,0.01,0.03, 0.01,0.02,0.06, 0.04,0.01,0.05, 0.03,0.02,0.09],
];

// Uniform transition matrix A
const A: number[][] = Array(5).fill(null).map(() => Array(5).fill(0.2));
const PI: number[] = [0.2, 0.2, 0.2, 0.2, 0.2];

export function computePersonality(obs: number[]): PersonalityResult {
  const N = 5;
  const T = obs.length;
  if (T === 0) {
    return { vector: [0.2, 0.2, 0.2, 0.2, 0.2], dominant: 'Explorer', dominantIndex: 0 };
  }
  // Forward algorithm
  const alpha: number[][] = Array(T).fill(null).map(() => Array(N).fill(0));
  for (let j = 0; j < N; j++) alpha[0][j] = PI[j] * (B[j][obs[0]] ?? 0.01);
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += alpha[t-1][i] * A[i][j];
      alpha[t][j] = sum * (B[j][obs[t]] ?? 0.01);
    }
  }
  const final = alpha[T-1];
  const total = final.reduce((a,b) => a+b, 0) || 1;
  const vector = final.map(v => v/total) as [number,number,number,number,number];
  const dominantIndex = vector.indexOf(Math.max(...vector));
  return { vector, dominant: ['Explorer','Connector','Restorer','Achiever','Guardian'][dominantIndex], dominantIndex };
}

export function matchScore(pv: number[], pw: number[]): number {
  // Dot product similarity — returns 0 to 1
  return Math.min(1, pv.reduce((sum, v, i) => sum + v * pw[i], 0) * 3.5);
}

// Compute group personality vector: arithmetic mean per dimension, L1-normalized.
// The result is a valid personality vector (sums to 1) representing the group as a whole.
export function computeGroupVector(
  vectors: Array<[number, number, number, number, number]>
): [number, number, number, number, number] {
  const N = vectors.length;
  if (N === 0) return [0.2, 0.2, 0.2, 0.2, 0.2];
  const sum = vectors.reduce<number[]>(
    (acc, v) => acc.map((a, i) => a + v[i]),
    [0, 0, 0, 0, 0]
  );
  const total = sum.reduce((a, b) => a + b, 0) || 1;
  return sum.map(s => s / total) as [number, number, number, number, number];
}
