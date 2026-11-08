export const GROUNDED_PRIVILEGES = [
  { id: 'ipad', name: 'iPad' },
  { id: 'pc-gaming', name: 'PC gaming' },
  { id: 'pouch-time-choosing', name: 'Pouch time choosing' },
] as const;
export type GroundedPrivilege = typeof GROUNDED_PRIVILEGES[number]['id'];
export interface Restriction {
  id: string;
  memberId: string;
  privilege: GroundedPrivilege;
  createdAt: string;
  endsAt: string | null;
}
export function isActiveRestriction(restriction: Restriction, now: Date): boolean {
  return restriction.endsAt === null || Date.parse(restriction.endsAt) > now.getTime();
}
export function validateRestriction(memberId: string, privilege: string, endsAt: string | null, now: Date): string | null {
  if (!memberId) return 'Choose a child.';
  if (!GROUNDED_PRIVILEGES.some(p => p.id === privilege)) return 'Choose a privilege.';
  if (endsAt !== null && (!Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= now.getTime())) {
    return 'Choose an end time in the future, or leave it empty.';
  }
  return null;
}
