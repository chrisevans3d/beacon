import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { DashboardCardProps } from '../../types/dashboard-cards';
import type { CalendarEvent } from '../../types';
import { EventCard } from '../EventCard';
import { useTranslation } from '../../i18n';
import '../../styles/five-day.css';

/** Calendar end dates are exclusive, including all-day and overnight events. */
export function eventsForDay(events: CalendarEvent[], day: Date) {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return events.filter(event => {
    const begins = parseISO(event.start).getTime();
    const ends = parseISO(event.end).getTime();
    return begins < end && (ends > start || (begins === ends && begins >= start));
  }).sort((a, b) => Number(b.allDay) - Number(a.allDay) || parseISO(a.start).getTime() - parseISO(b.start).getTime());
}

export function FiveDayCard({ context }: DashboardCardProps) {
  const { t, dateLocale } = useTranslation();
  const start = startOfDay(context.selectedDate);
  return <section className="five-day-card" aria-label="Next 5 Days">
    <header className="five-day-header">
      <h2 className="dashboard-section-title">Next 5 Days</h2>
      <span>{format(start, 'MMM d', { locale: dateLocale })} – {format(addDays(start, 4), 'MMM d', { locale: dateLocale })}</span>
    </header>
    <div className="five-day-grid">{Array.from({ length: 5 }, (_, i) => {
      const day = addDays(start, i);
      const events = eventsForDay(context.events, day);
      const today = isSameDay(day, context.now);
      return <section key={day.toISOString()} className={`five-day-column${today ? ' five-day-column--today' : ''}`} aria-label={format(day, 'EEEE, MMMM d', { locale: dateLocale })}>
        <h3>{today ? t('common.today') : format(day, 'EEE', { locale: dateLocale })}<span>{format(day, 'MMM d', { locale: dateLocale })}</span></h3>
        {events.length ? events.map(event => <EventCard key={event.id} event={event} onClick={context.onEventClick} />) : <p className="five-day-empty">No events</p>}
      </section>;
    })}</div>
  </section>;
}
