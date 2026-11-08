import { addDays, format, isSameDay } from 'date-fns';
import type { DashboardCardProps } from '../../types/dashboard-cards';
import { useFamilyWeather } from '../../hooks/useFamilyWeather';
import { celsius, clothingAdvice, nightClouds } from '../../utils/weather-outlook';
import { weatherIcon, conditionLabel } from '../../types/weather-icons';
import { useTranslation } from '../../i18n';
import '../../styles/family-weather.css';

export function FamilyWeatherCard({ config, context }: DashboardCardProps) {
  const { t, dateLocale } = useTranslation();
  const data = useFamilyWeather(typeof config.entity_id === 'string' ? config.entity_id : '');
  const days = [0, 1, 2].map(offset => {
    const date = addDays(context.now, offset);
    // Date-only forecast values represent local calendar dates, not UTC midnight.
    const daily = data.daily.find(f => isSameDay(new Date(f.datetime.length === 10 ? `${f.datetime}T12:00:00` : f.datetime), date));
    return { date, daily, night: nightClouds(date, data.hourly, context.now) };
  });
  const comparable = days.filter(day => day.night.complete && day.night.cloud !== null);
  const bestCloud = comparable.length >= 2 ? Math.min(...comparable.map(day => day.night.cloud!)) : null;
  const temp = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${data.unit || '°'}` : '—';
  return <section className="dash-sidebar-section family-weather" aria-label="Family Weather & Night Sky">
    <h3 className="dash-sidebar-heading">Family Weather & Night Sky</h3>
    {data.loading ? <p role="status">Loading forecast…</p> : data.error ? <p role="status">{data.error}</p> : <>
      <div className="family-weather-days">{days.map(({ date, daily, night }, i) => {
        const low = celsius(daily?.templow, data.unit);
        return <article className="family-weather-day" key={format(date, 'yyyy-MM-dd')}>
          <h4>{i === 0 ? 'Today' : format(date, 'EEEE', { locale: dateLocale })} <small>{format(date, 'MMM d', { locale: dateLocale })}</small></h4>
          {daily ? <>
            <p>{daily.condition && <>{weatherIcon(daily.condition)} {conditionLabel(daily.condition, t)}</>}</p>
            <p><strong>High {temp(daily.temperature)}</strong> · Low {temp(daily.templow)}</p>
            {typeof daily.precipitation_probability === 'number' && <p>Precipitation chance: {daily.precipitation_probability}%</p>}
            {low !== undefined && low <= 0 && <p className="family-weather-freeze">❄ Freeze forecast — protect plants and watch for ice</p>}
            <p>{clothingAdvice(daily, data.unit)}</p>
          </> : <p>Daily forecast unavailable</p>}
          <div className="family-weather-night">
            <strong>{i === 0 ? 'Tonight' : `${format(date, 'EEE', { locale: dateLocale })} night`}</strong>
            {night.cloud === null ? <p>Hourly cloud cover unavailable</p> : <>
              <p>{night.cloud}% average cloud cover · {night.cloud <= 20 ? 'Mostly clear' : night.cloud <= 50 ? 'Mixed skies' : 'Cloudy'}</p>
              <meter min="0" max="100" value={100 - night.cloud} aria-label="Sky clarity based on cloud cover" />
              <p>{night.hours} forecast hours{!night.complete && ' · Partial night coverage'}</p>
              {night.complete && bestCloud !== null && night.cloud === bestCloud && <strong className="family-weather-best">★ Least cloudy of available nights</strong>}
            </>}
          </div>
        </article>;
      })}</div>
      <p className="family-weather-note">Night outlook: 6 PM–6 AM, device local time; future hours only. Cloud cover is one factor for astrophotography, alongside moonlight, seeing, transparency and wind. Missing cloud data is never treated as clear sky.</p>
      <p className="family-weather-note">Clothing suggestions use daily highs/lows; check conditions before heading out. {data.updated && `Updated ${format(data.updated, 'p', { locale: dateLocale })}`}</p>
    </>}
  </section>;
}
