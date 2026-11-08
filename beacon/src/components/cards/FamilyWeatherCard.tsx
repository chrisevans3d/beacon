import { addDays, format, isSameDay } from 'date-fns';
import type { DashboardCardProps } from '../../types/dashboard-cards';
import { useFamilyWeather } from '../../hooks/useFamilyWeather';
import { celsius, compactClothingAdvice, nightClouds, nightCloudHours } from '../../utils/weather-outlook';
import { weatherIcon, conditionLabel } from '../../types/weather-icons';
import { useTranslation } from '../../i18n';
import '../../styles/family-weather.css';

export function FamilyWeatherCard({ config, context }: DashboardCardProps) {
  const { t, dateLocale } = useTranslation();
  const data = useFamilyWeather(typeof config.entity_id === 'string' ? config.entity_id : '');
  const days = [0, 1, 2].map(offset => {
    const date = addDays(context.now, offset);
    const daily = data.daily.find(f => isSameDay(new Date(f.datetime.length === 10 ? `${f.datetime}T12:00:00` : f.datetime), date));
    return { date, daily, night: nightClouds(date, data.hourly, context.now), hours: nightCloudHours(date, data.hourly, context.now) };
  });
  const comparable = days.filter(day => day.night.complete && day.night.cloud !== null);
  const bestCloud = comparable.length >= 2 ? Math.min(...comparable.map(day => day.night.cloud!)) : null;
  const temp = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${data.unit || '°'}` : '—';
  return <section className="dash-sidebar-section family-weather" aria-label="Family Weather & Night Sky">
    <header className="family-weather-header"><h3>Family Weather & Night Sky</h3>
      {data.updated && <small>Updated {format(data.updated, 'p', { locale: dateLocale })}</small>}</header>
    {data.loading ? <p role="status">Loading forecast…</p> : data.error ? <p role="status">{data.error}</p> : <>
      <div className="family-weather-days">{days.map(({ date, daily, night, hours }, i) => {
        const low = celsius(daily?.templow, data.unit);
        return <article className="family-weather-day" key={format(date, 'yyyy-MM-dd')}>
          <h4>{i === 0 ? 'Today' : format(date, 'EEE', { locale: dateLocale })}<small>{format(date, 'MMM d', { locale: dateLocale })}</small></h4>
          {daily ? <>
            <div className="family-weather-condition">{daily.condition && <>{weatherIcon(daily.condition)} {conditionLabel(daily.condition, t)}</>}</div>
            <p className="family-weather-temps"><strong aria-label={`High ${temp(daily.temperature)}`}>↑ {temp(daily.temperature)}</strong><span aria-label={`Low ${temp(daily.templow)}`}>↓ {temp(daily.templow)}</span></p>
            {low !== undefined && low <= 0 && <p className="family-weather-freeze">❄ Freeze forecast</p>}
            <p className="family-weather-clothes">{compactClothingAdvice(daily, data.unit)}</p>
            {typeof daily.precipitation_probability === 'number' && <small>Precipitation {daily.precipitation_probability}%</small>}
          </> : <p>Daily forecast unavailable</p>}
          <div className="family-weather-night">
            <strong>{i === 0 ? 'Tonight' : `${format(date, 'EEE', { locale: dateLocale })} night`}</strong>
            {night.cloud === null ? <p className="family-weather-missing">Hourly cloud cover unavailable</p> : <>
              <p><span aria-hidden="true">{weatherIcon(night.cloud <= 20 ? 'clear-night' : night.cloud <= 50 ? 'partlycloudy' : 'cloudy')}</span> <strong>{night.cloud}%</strong> avg. clouds <span className="family-weather-sky">{night.cloud <= 20 ? 'Mostly clear' : night.cloud <= 50 ? 'Mixed skies' : 'Cloudy'}</span></p>
              <small>{night.hours}h covered{!night.complete && ' · Partial forecast'}</small>
              {night.complete && bestCloud !== null && night.cloud === bestCloud && <p className="family-weather-best">★ Least cloudy night</p>}
            </>}
            {hours.length > 0 && <details className="family-weather-hourly"><summary>Hourly cloud cover</summary>
              <ul>{hours.map(hour => <li key={hour.time.toISOString()}>
                <time dateTime={hour.time.toISOString()}>{format(hour.time, context.timeFormat === '24h' ? 'HH:mm' : 'h a', { locale: dateLocale })}</time>
                <span>{hour.cloud === null ? 'No data' : `${Math.round(hour.cloud)}% clouds`}</span>
              </li>)}</ul>
            </details>}
          </div>
        </article>;
      })}</div>
      <details className="family-weather-note"><summary>About this forecast</summary>
        <p>Night averages use available future hours from 6 PM–6 AM, device local time. Lower cloud cover is clearer; partial forecasts do not describe a whole night. No data is never treated as clear sky.</p>
        <p>Cloud cover does not measure astronomical darkness, moonlight, seeing, transparency or wind. Clothing tips use daily highs/lows; check conditions before heading out.</p>
      </details>
    </>}
  </section>;
}
