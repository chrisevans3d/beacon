import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroundedProvider } from '../hooks/useGrounded';
import { GroundedSummary, GroundedView } from './Grounded';
import type { FamilyMember } from '../types/family';
const members: FamilyMember[] = [
  { id: 'alex', name: 'Alex', role: 'child', avatar: 'A', color: '#123456' },
  { id: 'sam', name: 'Sam', role: 'child', avatar: 'S', color: '#123456' },
];
beforeEach(() => { localStorage.clear(); delete window.__BEACON_CONFIG__; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); delete window.__BEACON_CONFIG__; });
function show(family = members) { return render(<GroundedProvider members={family}><GroundedView /></GroundedProvider>); }
async function add() {
  await screen.findByText('No active restrictions.');
  fireEvent.change(screen.getByLabelText('Child'), { target: { value: 'alex' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add restriction' }));
  await screen.findByRole('button', { name: 'Restore now' });
}
describe('Grounded management', () => {
  it('adds, edits, persists and removes a restriction using its named privilege icons', async () => {
    const view = show(); await add();
    expect(JSON.parse(localStorage.getItem('beacon-grounded')!)[0].privilege).toBe('ipad');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByLabelText('Pouch time choosing'));
    fireEvent.change(screen.getByLabelText('Ends at (optional)'), { target: { value: '2099-01-02T19:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('beacon-grounded')!)[0].privilege).toBe('pouch-time-choosing'));
    view.unmount(); show();
    await screen.findByText('Alex · Pouch time choosing');
    fireEvent.click(screen.getByRole('button', { name: 'Restore now' }));
    expect(screen.getByRole('button', { name: 'Confirm removal' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    await screen.findByText('No active restrictions.');
    expect(JSON.parse(localStorage.getItem('beacon-grounded')!)).toEqual([]);
  });
  it('rejects duplicate privileges without losing existing entries', async () => {
    show(); await add();
    fireEvent.change(screen.getByLabelText('Child'), { target: { value: 'alex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add restriction' }));
    await screen.findByText(/already has that restriction/);
    expect(JSON.parse(localStorage.getItem('beacon-grounded')!)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Child'), { target: { value: 'sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add restriction' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('beacon-grounded')!)).toHaveLength(2));
  });
  it('requires a configured parent PIN before editing and supports relocking', async () => {
    show([...members, { id: 'parent', name: 'Parent', role: 'parent', avatar: 'P', color: '#123456', pin: '1234' }]);
    expect(screen.queryByLabelText('Child')).toBeNull();
    fireEvent.change(screen.getByLabelText('Parent PIN'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock editing' }));
    expect(screen.getByRole('alert').textContent).toContain('does not match');
    fireEvent.change(screen.getByLabelText('Parent PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock editing' }));
    expect(screen.getByLabelText('Child')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lock editing' }));
    expect(screen.queryByLabelText('Child')).toBeNull();
  });
  it('marks expired records available and leaves them out of the card', async () => {
    localStorage.setItem('beacon-grounded', JSON.stringify([{ id: 'old', memberId: 'alex', privilege: 'ipad', createdAt: '2020-01-01T12:00:00Z', endsAt: '2020-01-02T12:00:00Z' }]));
    show(); await screen.findByText(/Ended — available again/);
    const summary = screen.getByRole('heading', { name: 'Grounded', level: 3 }).closest('section')!;
    expect(within(summary).queryByText('iPad · Blocked')).toBeNull();
    expect(within(summary).getByText('No active restrictions.')).toBeTruthy();
  });
  it('shows server write failures without claiming that the restriction was saved', async () => {
    window.__BEACON_CONFIG__ = {} as NonNullable<Window['__BEACON_CONFIG__']>;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) =>
      init?.method === 'PUT' ? new Response('', { status: 500 }) : new Response('null', { status: 200 }));
    show();
    await screen.findByText('No active restrictions.');
    fireEvent.change(screen.getByLabelText('Child'), { target: { value: 'alex' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add restriction' }));
    await screen.findByText(/Could not save Grounded/);
    expect(screen.queryByRole('button', { name: 'Restore now' })).toBeNull();
    expect(localStorage.getItem('beacon-grounded')).toBeNull();
  });
  it('expires a restriction on screen without requiring a reload', async () => {
    vi.useFakeTimers();
    const start = new Date(2026, 10, 8, 12); vi.setSystemTime(start);
    localStorage.setItem('beacon-grounded', JSON.stringify([{ id: 'short', memberId: 'alex', privilege: 'pc-gaming', createdAt: start.toISOString(), endsAt: new Date(+start + 2000).toISOString() }]));
    const { act } = await import('@testing-library/react');
    render(<GroundedProvider members={members}><GroundedSummary /></GroundedProvider>);
    await act(async () => {});
    expect(screen.getByText('PC gaming · Blocked')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('No active restrictions.')).toBeTruthy();
    cleanup(); vi.useRealTimers();
  });
});
