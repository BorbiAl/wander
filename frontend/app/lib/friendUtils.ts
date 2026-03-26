import { FriendProfile, GroupScoredExperience, Experience } from './data';
import { matchScore, computeGroupVector } from './hmm';

type EncodedPayload = {
  u: string;  // userId
  v: [number, number, number, number, number]; // personality vector (3dp)
  d: string;  // dominant
  n: string;  // displayName
};

export function encodeProfileLink(
  userId: string,
  vector: [number, number, number, number, number],
  dominant: string,
  displayName: string
): string {
  const payload: EncodedPayload = {
    u: userId,
    v: vector.map(x => Math.round(x * 1000) / 1000) as [number, number, number, number, number],
    d: dominant,
    n: displayName,
  };
  return btoa(JSON.stringify(payload));
}

export function decodeProfileLink(input: string): FriendProfile | null {
  try {
    // Accept either a full URL (with ?add=...) or a bare base64 string
    let encoded = input.trim();
    if (encoded.includes('?')) {
      const url = new URL(encoded);
      encoded = url.searchParams.get('add') ?? encoded;
    } else if (encoded.includes('add=')) {
      // Handle partial query string like "add=..."
      encoded = encoded.split('add=')[1] ?? encoded;
    }
    const payload: EncodedPayload = JSON.parse(atob(encoded));
    if (!payload.u || !Array.isArray(payload.v) || payload.v.length !== 5 || !payload.d) {
      return null;
    }
    return {
      userId: payload.u,
      displayName: payload.n || 'Traveler',
      vector: payload.v,
      dominant: payload.d,
      addedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(
  userId: string,
  vector: [number, number, number, number, number],
  dominant: string,
  displayName: string
): string {
  const encoded = encodeProfileLink(userId, vector, dominant, displayName);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/friends?add=${encoded}`;
}

export function scoreGroupExperiences(
  experiences: Experience[],
  members: Array<{ userId: string; vector: [number, number, number, number, number] }>,
  groupVector: [number, number, number, number, number]
): GroupScoredExperience[] {
  return experiences.map(exp => {
    const score = matchScore(groupVector, exp.personalityWeights);
    const memberScores = members.map(m => matchScore(m.vector, exp.personalityWeights));
    const minMemberScore = memberScores.length > 0 ? Math.min(...memberScores) : score;
    return { ...exp, score, memberScores, minMemberScore };
  });
}
