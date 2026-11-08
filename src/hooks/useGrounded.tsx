import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { readRestrictions, writeRestrictions } from '../api/grounded';
import { isActiveRestriction, validateRestriction, type Restriction, type GroundedPrivilege } from '../types/grounded';
import type { FamilyMember } from '../types/family';

interface GroundedState {
  restrictions: Restriction[]; members: FamilyMember[]; now: Date;
  loading: boolean; busy: boolean; error: string | null;
  refresh: () => Promise<void>;
  save: (id: string | null, memberId: string, privilege: GroundedPrivilege, endsAt: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
const Context = createContext<GroundedState | null>(null);
export function GroundedProvider({ members, children }: { members: FamilyMember[]; children: ReactNode }) {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);
  const refresh = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    try { setRestrictions(await readRestrictions()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load Grounded.'); }
    finally { setLoading(false); working.current = false; }
  }, []);
  useEffect(() => {
    void refresh();
    const poll = setInterval(() => { void refresh(); }, 15_000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(poll); clearInterval(clock); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  const mutate = async (update: (current: Restriction[]) => Restriction[]) => {
    if (working.current) throw new Error('Grounded is refreshing. Try again in a moment.');
    working.current = true; setBusy(true);
    try {
      const next = update(await readRestrictions());
      await writeRestrictions(next);
      setRestrictions(next); setNow(new Date()); setError(null);
    } catch (e) { const message = e instanceof Error ? e.message : 'Could not save Grounded.'; throw new Error(message); }
    finally { working.current = false; setBusy(false); }
  };
  const save: GroundedState['save'] = (id, memberId, privilege, endsAt) => mutate(current => {
    const error = validateRestriction(memberId, privilege, endsAt, new Date());
    if (error) throw new Error(error);
    if (!members.some(m => m.id === memberId && m.role === 'child')) throw new Error('Choose a child from Family settings.');
    if (id && !current.some(r => r.id === id)) throw new Error('This restriction was removed elsewhere. Refresh and try again.');
    if (current.some(r => r.id !== id && r.memberId === memberId && r.privilege === privilege && isActiveRestriction(r, new Date()))) {
      throw new Error('This child already has that restriction. Edit the existing entry.');
    }
    const record: Restriction = { id: id ?? crypto.randomUUID(), memberId, privilege, endsAt,
      createdAt: current.find(r => r.id === id)?.createdAt ?? new Date().toISOString() };
    return [...current.filter(r => r.id !== id), record];
  });
  return <Context.Provider value={{ restrictions, members, now, loading, busy, error, refresh, save,
    remove: id => mutate(current => current.filter(r => r.id !== id)) }}>{children}</Context.Provider>;
}
export function useGrounded() {
  const context = useContext(Context);
  if (!context) throw new Error('GroundedProvider is required');
  return context;
}
