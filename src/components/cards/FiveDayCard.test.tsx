import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FiveDayCard, eventsForDay } from './FiveDayCard';
import type { CalendarEvent } from '../../types';
import type { DashboardCardContext } from '../../types/dashboard-cards';
afterEach(cleanup);
const event = (id: string, start: string, end: string, allDay = false): CalendarEvent => ({
  id, title: id, start, end, allDay, color: '#123456', calendarId: 'family', calendarName: 'Family',
});

describe('horizontal five-day agenda', () => {
  it('shows five columns from the selected date with empty days and working event actions', () => {
    const onEventClick = vi.fn();
    const meeting = event('Swimming', '2026-11-09T18:00:00', '2026-11-09T19:00:00');
    const context = { selectedDate: new Date(2026, 10, 8), now: new Date(2026, 10, 8), events: [meeting], onEventClick } as unknown as DashboardCardContext;
    const { container, rerender } = render(<FiveDayCard config={{}} context={context} />);
    expect(container.querySelectorAll('.five-day-column')).toHaveLength(5);
    expect(screen.getByRole('region', { name: 'Sunday, November 8' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Thursday, November 12' })).toBeTruthy();
    expect(screen.getAllByText('No events')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /Swimming/ }));
    expect(onEventClick).toHaveBeenCalledWith(meeting);
    rerender(<FiveDayCard config={{}} context={{ ...context, selectedDate: new Date(2026, 10, 10) }} />);
    expect(screen.queryByText('Swimming')).toBeNull();
    expect(screen.getByRole('region', { name: 'Saturday, November 14' })).toBeTruthy();
  });
  it('includes multi-day and overnight events but excludes the exclusive end date', () => {
    const trip = event('Trip', '2026-11-08', '2026-11-10', true);
    const night = event('Overnight', '2026-11-08T23:00:00', '2026-11-09T01:00:00');
    expect(eventsForDay([night, trip], new Date(2026, 10, 9)).map(e => e.id)).toEqual(['Trip', 'Overnight']);
    expect(eventsForDay([night, trip], new Date(2026, 10, 10))).toEqual([]);
    const midnightEnd = event('Ends at midnight', '2026-11-08T21:00:00', '2026-11-09T00:00:00');
    expect(eventsForDay([midnightEnd], new Date(2026, 10, 9))).toEqual([]);
  });
});
