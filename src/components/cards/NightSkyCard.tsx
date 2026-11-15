import { useMemo } from 'react';
import type { DashboardCardProps } from '../../types/dashboard-cards';
import { useFamilyWeather } from '../../hooks/useFamilyWeather';
import { useObservingSite } from '../../hooks/useObservingSite';
import { buildNightSkyPlan, compass, readPorch } from '../../utils/night-sky';
import type { SkyNight } from '../../utils/night-sky';
import { weatherIcon } from '../../types/weather-icons';
import '../../styles/night-sky.css';

export function NightSkyCard({ config, context, compact = false }: DashboardCardProps & { compact?: boolean }) {
  const weather = useFamilyWeather(typeof config.entity_id === 'string' ? config.entity_id : '');
  const location = useObservingSite(config);
  const { latitude, longitude, elevation, timeZone } = location.site ?? {};
  const minute = Math.floor(+context.now / 60_000);
  const plan = useMemo(() => {
    if (latitude === undefined || longitude === undefined || elevation === undefined || !timeZone) return { nights: [], error: null };
    try {
      return { nights: buildNightSkyPlan(new Date(minute * 60_000), { latitude, longitude, elevation, timeZone }, readPorch(config), weather.hourly), error: null };
    } catch (e) { return { nights: [], error: e instanceof Error ? e.message : 'Could not calculate targets.' }; }
  // Recalculate once per minute, forecast change, location change or porch edit.
  }, [minute, latitude, longitude, elevation, timeZone, config.azimuth_start, config.azimuth_end, config.min_altitude, config.max_altitude, weather.hourly]);
  const error = location.error ?? plan.error;
  const setting = (key: string, fallback: number) => String(config[key] === undefined || config[key] === '' ? fallback : config[key]);
  const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(date);
  const time = (date: Date) => format(date, { hour: 'numeric', minute: '2-digit', hour12: context.timeFormat !== '24h' });
  const date = (value: Date) => format(value, { weekday: 'short', month: 'short', day: 'numeric' });
  const range = (start: Date, end: Date) => `${time(start)}–${format(start, { day: 'numeric', month: 'numeric' }) !== format(end, { day: 'numeric', month: 'numeric' }) ? date(end) + ' ' : ''}${time(end)}`;
  const clouds = (night: SkyNight) => <>
    {night.cloud === null ? <span className="night-sky-muted">Cloud forecast unavailable</span> : <>
      <span aria-hidden="true">{weatherIcon(night.cloud <= 20 ? 'clear-night' : night.cloud <= 50 ? 'partlycloudy' : 'cloudy')}</span>
      <strong> {night.cloud}% avg. clouds</strong>
      {night.coverage < 100 && <small> · Partial ({night.coverage}% covered)</small>}
    </>}
  </>;
  if (compact) return <section className="night-sky-header" aria-label="Night Sky — Header">
    <strong>☾ Night Sky</strong>
    {location.loading ? <span role="status">Finding location…</span> : error ? <span role="status">{error}</span> : !plan.nights.length ? <span>No astronomical darkness in the next 72h</span> : <>
      <div className="night-sky-header-clouds">{clouds(plan.nights[0])}</div>
      <div className="night-sky-header-target">{plan.nights[0].targets[0] ? <>
        <strong>{plan.nights[0].targets[0].name}</strong><span>Best {time(plan.nights[0].targets[0].best)} · {compass(plan.nights[0].targets[0].azimuth)}</span>
      </> : <span>No targets fit the porch window</span>}</div>
    </>}
  </section>;
  return <section className="night-sky-card" aria-label="Night Sky">
    <header className="night-sky-title"><h3>☾ Night Sky</h3><span>{timeZone ?? 'Location needed'}</span></header>
    {location.loading ? <p role="status">Finding Home Assistant’s location…</p> : error ? <p role="alert">{error}</p> : <>
      <p className="night-sky-view">Porch {setting('azimuth_start', 270)}°–{setting('azimuth_end', 340)}° · Elevation {setting('min_altitude', 25)}°–{setting('max_altitude', 90)}°</p>
      {weather.error && <p role="status">Weather unavailable — target times are based on visibility only.</p>}
      {weather.loading && <p role="status">Loading cloud forecast…</p>}
      {!plan.nights.length && <p>No astronomical darkness in the next 72 hours at this location.</p>}
      <div className="night-sky-nights">{plan.nights.map((night, index) => <article className="night-sky-night" key={night.start.toISOString()}>
        <header><h4>{index === 0 && +context.now >= +night.start - 600_000 ? 'Remaining night' : date(night.start)}</h4><span>{clouds(night)}</span></header>
        <p className="night-sky-muted">Dark {range(night.start, night.end)} · Moon {night.moonIllumination}% lit</p>
        {night.targets.length ? <ul className="night-sky-targets">{night.targets.map(target => <li key={target.id}>
          <div className="night-sky-target-title"><strong>{target.name}</strong><small>{target.kind}{target.sizeArcmin !== null && ` · ${target.sizeArcmin}′`}</small></div>
          <p>Window {range(target.start, target.end)}</p>
          <p className="night-sky-best">Best {time(target.best)} · {Math.round(target.altitude)}° up · {compass(target.azimuth)} ({Math.round(target.azimuth)}°)</p>
          <small>{target.cloud === null ? 'No cloud forecast — timing only' : `${target.cloud}% avg. clouds${target.coverage < 100 ? ' · Partial forecast' : ''}`} · {target.moonAltitude < 0 ? 'Moon below horizon at best time' : `Moon ${Math.round(target.moonSeparation)}° away at best time`}</small>
        </li>)}</ul> : <p>No target has a 30-minute window in this porch view below 70% forecast cloud cover. Try a wider compass range or lower minimum elevation.</p>}
        <details className="night-sky-hourly"><summary>Hourly cloud forecast</summary>
          {weather.hourly.some(f => Date.parse(f.datetime) + 3_600_000 > +night.start && Date.parse(f.datetime) < +night.end) ? <ul>
            {weather.hourly.filter(f => Date.parse(f.datetime) + 3_600_000 > +night.start && Date.parse(f.datetime) < +night.end)
              .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)).map(f => <li key={f.datetime}>
                <time dateTime={f.datetime}>{time(new Date(f.datetime))}</time><span>{typeof f.cloud_coverage === 'number' && Number.isFinite(f.cloud_coverage) && f.cloud_coverage >= 0 && f.cloud_coverage <= 100 ? `${Math.round(f.cloud_coverage)}% clouds` : 'No cloud data'}</span>
              </li>)}
          </ul> : <p>No hourly cloud forecast for this dark window.</p>}
        </details>
      </article>)}</div>
      <details className="night-sky-about"><summary>How these suggestions work</summary>
        <p>Next 72 hours, sampled every 10 minutes. Dark means Sun below −18°. Bearings use true north (N 0°, E 90°, S 180°, W 270°); compass ranges may cross north. Location comes from Home Assistant unless overridden in this card’s gear settings. All positions are calculated locally.</p>
        <p>Suggestions favor elevation, low cloud cover and less moon interference. Hours with more than 70% forecast cloud cover are excluded. Unknown weather stays unknown. Clouds do not measure atmospheric seeing or transparency. Windows and best times are approximate, not guarantees of clear skies.</p>
        <p>This is a curated set of 26 deep-sky objects plus Jupiter, Saturn and Mars, not an exhaustive catalog. Angular size is the catalog’s major axis; telescope/camera framing and light pollution are not yet modeled.</p>
        <p>Coordinates and sizes adapted from <a href="https://github.com/mattiaverga/OpenNGC" target="_blank" rel="noreferrer">OpenNGC by Mattia Verga and contributors</a>, licensed <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Ephemerides: Astronomy Engine (MIT).</p>
      </details>
    </>}
  </section>;
}
