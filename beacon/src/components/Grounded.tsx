import { useState, useEffect } from 'react';
import { Tablet, Gamepad2, Tv, ShieldBan } from 'lucide-react';
import { format } from 'date-fns';
import { useGrounded } from '../hooks/useGrounded';
import { GROUNDED_PRIVILEGES, isActiveRestriction, type GroundedPrivilege, type Restriction } from '../types/grounded';
import { useTranslation } from '../i18n';
import '../styles/grounded.css';

export function PrivilegeIcon({ privilege }: { privilege: GroundedPrivilege }) {
  const Icon = privilege === 'ipad' ? Tablet : privilege === 'pc-gaming' ? Gamepad2 : Tv;
  return <Icon size={24} aria-hidden="true" />;
}
function Ends({ restriction }: { restriction: Restriction }) {
  const { dateLocale } = useTranslation();
  return <span>{restriction.endsAt ? `Until ${format(new Date(restriction.endsAt), 'PPp', { locale: dateLocale })}` : 'Until restored by a parent'}</span>;
}
export function GroundedSummary() {
  const { restrictions, members, now, loading, error } = useGrounded();
  const active = restrictions.filter(r => isActiveRestriction(r, now));
  return <section className="dash-sidebar-section grounded-summary">
    <h3 className="dash-sidebar-heading"><ShieldBan size={22} aria-hidden="true" /> Grounded</h3>
    {loading ? <p role="status">Loading Grounded…</p> : <>
      {error && <p role="alert">{error}</p>}
      {!error && active.length === 0 && <p>No active restrictions.</p>}
      {active.map(r => <div className="grounded-restriction" key={r.id}>
        <PrivilegeIcon privilege={r.privilege} />
        <div><strong>{members.find(m => m.id === r.memberId)?.name ?? 'Removed family member'}</strong>
          <div>{GROUNDED_PRIVILEGES.find(p => p.id === r.privilege)?.name} · Blocked</div>
          <small><Ends restriction={r} /></small></div>
      </div>)}
    </>}
  </section>;
}
export function GroundedView() {
  const { restrictions, members, now, loading, busy, error, refresh, save, remove } = useGrounded();
  const children = members.filter(m => m.role === 'child');
  const parents = members.filter(m => m.role === 'parent' && m.pin);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [memberId, setMemberId] = useState('');
  const [privilege, setPrivilege] = useState<GroundedPrivilege>('ipad');
  const [end, setEnd] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const canManage = parents.length === 0 || unlocked;
  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(() => setUnlocked(false), 2 * 60_000);
    return () => clearTimeout(timer);
  }, [unlocked]);
  const reset = () => { setEditing(null); setMemberId(''); setPrivilege('ipad'); setEnd(''); setFormError(''); };
  const edit = (r: Restriction) => {
    setEditing(r.id); setMemberId(r.memberId); setPrivilege(r.privilege);
    setEnd(r.endsAt ? format(new Date(r.endsAt), "yyyy-MM-dd'T'HH:mm") : ''); setFormError('');
  };
  return <div className="grounded-view">
    <header><h1>Grounded</h1><p>Who is blocked from what, and when it becomes available again.</p></header>
    <GroundedSummary />
    {error && <button type="button" className="btn btn--secondary" onClick={() => { void refresh(); }}>Retry loading</button>}
    {parents.length === 0 && <p className="grounded-note">Set a parent PIN in Family settings to lock the editing controls.</p>}
    {!canManage ? <form className="grounded-form" onSubmit={e => {
      e.preventDefault();
      if (parents.some(p => p.pin === pin)) { setUnlocked(true); setPin(''); setPinError(''); }
      else { setPinError('That PIN does not match a parent.'); setPin(''); }
    }}>
      <label>Parent PIN<input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={e => setPin(e.target.value)} required /></label>
      <button className="btn btn--primary">Unlock editing</button>
      {pinError && <p role="alert">{pinError}</p>}
    </form> : <>
      {parents.length > 0 && <button type="button" className="btn btn--secondary" onClick={() => { setUnlocked(false); setConfirmRemove(null); }}>Lock editing</button>}
      {children.length === 0 ? <p>Add children in Settings → Family before adding restrictions.</p> : <form className="grounded-form" onSubmit={async e => {
        e.preventDefault(); setFormError('');
        try {
          const endsAt = end ? new Date(end).toISOString() : null;
          await save(editing, memberId, privilege, endsAt); reset();
        } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not save.'); }
      }}>
        <h2>{editing ? 'Edit restriction' : 'Add restriction'}</h2>
        <label>Child<select value={memberId} required onChange={e => setMemberId(e.target.value)}><option value="">Choose a child</option>{children.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <fieldset><legend>Blocked privilege</legend><div className="grounded-privileges">{GROUNDED_PRIVILEGES.map(p => <label key={p.id} className="grounded-choice">
          <input type="radio" name="privilege" value={p.id} checked={privilege === p.id} onChange={() => setPrivilege(p.id)} />
          <PrivilegeIcon privilege={p.id} />{p.name}
        </label>)}</div></fieldset>
        <label>Ends at (optional)<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <p className="grounded-note">Uses this device’s local time. Leave empty to keep blocked until a parent restores it. Pouch time choosing means choosing the TV show at Pouch time.</p>
        <div className="grounded-actions"><button className="btn btn--primary" disabled={loading || busy || !!error}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add restriction'}</button>
          {editing && <button type="button" className="btn btn--secondary" onClick={reset}>Cancel edit</button>}</div>
        {formError && <p role="alert">{formError}</p>}
      </form>}
      <h2>Manage restrictions</h2>
      {restrictions.length === 0 && !loading && <p>No restrictions yet.</p>}
      {restrictions.map(r => <div className="grounded-restriction" key={r.id}>
        <PrivilegeIcon privilege={r.privilege} /><div className="grounded-detail">
          <strong>{members.find(m => m.id === r.memberId)?.name ?? 'Removed family member'} · {GROUNDED_PRIVILEGES.find(p => p.id === r.privilege)?.name}</strong>
          <div>{isActiveRestriction(r, now) ? 'Blocked' : 'Ended — available again'} · <Ends restriction={r} /></div>
        </div>
        <div className="grounded-actions"><button type="button" className="btn btn--secondary" disabled={busy || loading || !!error} onClick={() => edit(r)}>Edit</button>
          <button type="button" className="btn btn--secondary" disabled={busy || loading || !!error} onClick={async () => {
            if (confirmRemove !== r.id) { setConfirmRemove(r.id); return; }
            try { await remove(r.id); setConfirmRemove(null); if (editing === r.id) reset(); }
            catch (e) { setFormError(e instanceof Error ? e.message : 'Could not remove.'); }
          }}>{confirmRemove === r.id ? 'Confirm removal' : isActiveRestriction(r, now) ? 'Restore now' : 'Remove'}</button>
          {confirmRemove === r.id && <button type="button" className="btn btn--secondary" onClick={() => setConfirmRemove(null)}>Cancel</button>}
        </div>
      </div>)}
    </>}
    <p className="grounded-note">This tracks privileges; it does not block devices or TV access. Parent PINs are a touchscreen editing lock, not an account security boundary.</p>
  </div>;
}
