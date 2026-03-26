import { VILLAGES, HOSTS, EXPERIENCES } from './data';
import { matchScore } from './hmm';

export function cwsColor(cws: number): string {
  if (cws >= 65) return '#C8F55A';
  if (cws >= 50) return '#F5A623';
  return '#FF4444';
}

export function cwsLabel(cws: number): string {
  if (cws >= 65) return 'Thriving';
  if (cws >= 50) return 'Growing';
  return 'Pioneer territory';
}

export function formatEur(amount: number): string {
  return `€${amount.toFixed(0)}`;
}

export function getVillage(id: string) {
  return VILLAGES.find(v => v.id === id);
}

export function getHost(id: string) {
  return HOSTS.find(h => h.id === id);
}

export function getExperience(id: string) {
  return EXPERIENCES.find(e => e.id === id);
}

export function percentageMatch(pv: number[], pw: number[]): number {
  return Math.round(Math.min(99, matchScore(pv, pw) * 100));
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
