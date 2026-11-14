import { addDays, format, isSameDay } from 'date-fns';
import type { DashboardCardProps } from '../../types/dashboard-cards';
import { useFamilyWeather } from '../../hooks/useFamilyWeather';
import { celsius, nightClouds } from '../../utils/weather-outlook';
import { weatherIcon } from '../../types/weather-icons';
import { useTranslation } from '../../i18n';
import '../../styles/weather-header.css';

/** Shallow forecast strip for the right side of the dashboard header. */
export function WeatherHeaderCard({ config, context }: DashboardCardProps) {
  const { dateLocale } = useTranslation();
  const data = useFamilyWeather(typeof config.entity_id === 'string' ? config.entity_id : '');
  const temperature = data.current?.temperature;
  return <section className="weather-header-card" aria-label="Weather & Night Sky — Header">
    {data.loading ? <p role="status">Loading weather…</p> : data.error ? <p role="status">{data.error}</p> : <>
      <div className="weather-header-current">
        <strong>{typeof temperature === 'number' ? <><span aria-hidden="true">{weatherIcon(data.current?.condition ?? '')}</span> {Math.round(temperature)}{data.unit || '°'}</> : 'Weather & Night Sky'}</strong>
        <span>Nightly avg. clouds</span>
      </div>
      <ul className="weather-header-nights">{[0, 1, 2].map(offset => {
        const day = addDays(context.now, offset);
        const label = offset === 0 ? 'Tonight' : format(day, 'EEE', { locale: dateLocale });
        const night = nightClouds(day, data.hourly, context.now);
        const daily = data.daily.find(f => isSameDay(new Date(f.datetime.length === 10 ? `${f.datetime}T12:00:00` : f.datetime), day));
        const low = celsius(daily?.templow, data.unit);
        const freeze = low !== undefined && low <= 0;
        return <li key={format(day, 'yyyy-MM-dd')} className="weather-header-night">
          <span className="weather-header-night-label">{label}{freeze && <span className="weather-header-freeze" aria-label={`${label}: freeze forecast`} title="Daily low at or below freezing">❄ Freeze</span>}</span>
          {night.cloud === null ? <span className="weather-header-unavailable">No cloud data</span> : <>
            <strong title={`${night.hours} forecast hours, ${night.complete ? 'full' : 'partial'} night coverage. Planning window: 6 PM–6 AM, device local time.`}>
              <span aria-hidden="true">{weatherIcon(night.cloud <= 20 ? 'clear-night' : night.cloud <= 50 ? 'partlycloudy' : 'cloudy')}</span> {night.cloud}%
            </strong>
            {!night.complete && <small>Partial</small>}
          </>}
        </li>;
      })}</ul>
    </>}
  </section>;
}
