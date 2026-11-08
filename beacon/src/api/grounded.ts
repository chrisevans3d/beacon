import type { Restriction } from '../types/grounded';
import { GROUNDED_PRIVILEGES } from '../types/grounded';
const KEY = 'beacon-grounded';
const url = () => `${window.location.pathname.replace(/\/$/, '')}/beacon-data/${KEY}`;

function decode(value: unknown): Restriction[] {
  if (value === null) return [];
  if (!Array.isArray(value) || value.some(r => !r || typeof r.id !== 'string' ||
      typeof r.memberId !== 'string' || !GROUNDED_PRIVILEGES.some(p => p.id === r.privilege) ||
      typeof r.createdAt !== 'string' || !Number.isFinite(Date.parse(r.createdAt)) ||
      (r.endsAt !== null && (typeof r.endsAt !== 'string' || !Number.isFinite(Date.parse(r.endsAt)))))) {
    throw new Error('Saved Grounded data could not be read. No changes were made.');
  }
  return value as Restriction[];
}
export async function readRestrictions(): Promise<Restriction[]> {
  if (!window.__BEACON_CONFIG__) return decode(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  const response = await fetch(url());
  if (!response.ok) throw new Error('Could not load Grounded. Try again before editing.');
  return decode(await response.json());
}
export async function writeRestrictions(restrictions: Restriction[]): Promise<void> {
  if (!window.__BEACON_CONFIG__) {
    localStorage.setItem(KEY, JSON.stringify(restrictions));
    return;
  }
  const response = await fetch(url(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(restrictions) });
  if (!response.ok) throw new Error('Could not save Grounded. Your changes were not confirmed; try again.');
}
