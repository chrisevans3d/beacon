import { Body, Equator, EquatorFromVector, Horizon, Illumination, Observer,
  RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from 'astronomy-engine';
import { DEEP_SKY_TARGETS } from '../data/deep-sky-targets';
import type { WeatherForecast } from './weather-outlook';

export interface ObservingSite { latitude: number; longitude: number; elevation: number; timeZone: string }
export interface PorchView { azimuthStart: number; azimuthEnd: number; minAltitude: number; maxAltitude: number }
export const DEFAULT_PORCH: PorchView = { azimuthStart: 270, azimuthEnd: 340, minAltitude: 25, maxAltitude: 90 };
const STEP = 10 * 60_000;
const RAD = Math.PI / 180;

export function readPorch(config: Record<string, unknown>): PorchView {
  const number = (key: string, fallback: number) => {
    const raw = config[key];
    if (raw === undefined || raw === '') return fallback;
    const n = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(n)) throw new Error('Porch settings must be numbers. Open the card’s gear to correct them.');
    return n;
  };
  const view = { azimuthStart: number('azimuth_start', 270), azimuthEnd: number('azimuth_end', 340),
    minAltitude: number('min_altitude', 25), maxAltitude: number('max_altitude', 90) };
  if (view.azimuthStart < 0 || view.azimuthStart > 360 || view.azimuthEnd < 0 || view.azimuthEnd > 360 ||
      view.minAltitude < 0 || view.maxAltitude > 90 || view.minAltitude >= view.maxAltitude || view.azimuthStart === view.azimuthEnd) {
    throw new Error('Use compass bearings 0–360° and elevations 0–90°, with minimum below maximum. Use 0–360 for the whole sky.');
  }
  return view;
}
export function insidePorch(azimuth: number, altitude: number, view: PorchView): boolean {
  if (altitude < view.minAltitude || altitude > view.maxAltitude) return false;
  if (Math.abs(view.azimuthEnd - view.azimuthStart) === 360) return true;
  const start = view.azimuthStart % 360, end = view.azimuthEnd % 360;
  return start <= end ? azimuth >= start && azimuth <= end : azimuth >= start || azimuth <= end;
}
export function compass(azimuth: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(azimuth / 45) % 8];
}
export function cloudAt(time: Date, forecast: WeatherForecast[]): number | null {
  const sample = forecast.filter(f => Date.parse(f.datetime) <= +time && +time < Date.parse(f.datetime) + 3_600_000)
    .sort((a, b) => Date.parse(b.datetime) - Date.parse(a.datetime))[0];
  const cloud = sample?.cloud_coverage;
  return typeof cloud === 'number' && Number.isFinite(cloud) && cloud >= 0 && cloud <= 100 ? cloud : null;
}
interface Target { id: string; name: string; kind: string; sizeArcmin: number | null; ra?: number; dec?: number; body?: Body }
const TARGETS: Target[] = [...DEEP_SKY_TARGETS,
  { id: 'jupiter', name: 'Jupiter', kind: 'Planet', sizeArcmin: null, body: Body.Jupiter },
  { id: 'saturn', name: 'Saturn', kind: 'Planet', sizeArcmin: null, body: Body.Saturn },
  { id: 'mars', name: 'Mars', kind: 'Planet', sizeArcmin: null, body: Body.Mars },
];
export function targetPosition(target: { ra: number; dec: number }, time: Date, site: ObservingSite) {
  const equator = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(time),
    VectorFromSphere(new Spherical(target.dec, target.ra * 15, 1), time)));
  return Horizon(time, new Observer(site.latitude, site.longitude, site.elevation), equator.ra, equator.dec, 'normal');
}
interface Sample { time: Date; moonRa: number; moonDec: number; moonAltitude: number; cloud: number | null }
interface VisibleSample { time: Date; altitude: number; azimuth: number; cloud: number | null; moonSeparation: number; moonAltitude: number }
export interface TargetWindow {
  id: string; name: string; kind: string; sizeArcmin: number | null;
  start: Date; end: Date; best: Date; altitude: number; azimuth: number;
  cloud: number | null; coverage: number; moonSeparation: number; moonAltitude: number; score: number;
}
export interface SkyNight { start: Date; end: Date; cloud: number | null; coverage: number; moonIllumination: number; targets: TargetWindow[] }
function separation(ra1: number, dec1: number, ra2: number, dec2: number) {
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(dec1 * RAD) * Math.sin(dec2 * RAD) +
    Math.cos(dec1 * RAD) * Math.cos(dec2 * RAD) * Math.cos((ra1 - ra2) * 15 * RAD)))) / RAD;
}
function cloudSummary(samples: { cloud: number | null }[]) {
  const known = samples.flatMap(s => s.cloud === null ? [] : [s.cloud]);
  return { cloud: known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null,
    coverage: samples.length ? Math.round(100 * known.length / samples.length) : 0 };
}

/** Local ephemerides; next 72 hours, astronomical darkness (Sun below -18°), 10-minute samples. */
export function buildNightSkyPlan(now: Date, site: ObservingSite, porch: PorchView, forecast: WeatherForecast[]): SkyNight[] {
  const observer = new Observer(site.latitude, site.longitude, site.elevation);
  const groups: Sample[][] = [];
  let group: Sample[] = [];
  const stop = +now + 72 * 3_600_000;
  for (let t = Math.ceil(+now / STEP) * STEP; t < stop; t += STEP) {
    const time = new Date(t);
    const sun = Equator(Body.Sun, time, observer, true, true);
    if (Horizon(time, observer, sun.ra, sun.dec).altitude >= -18) {
      if (group.length) { groups.push(group); group = []; }
      continue;
    }
    const moon = Equator(Body.Moon, time, observer, true, true);
    group.push({ time, moonRa: moon.ra, moonDec: moon.dec,
      moonAltitude: Horizon(time, observer, moon.ra, moon.dec).altitude, cloud: cloudAt(time, forecast) });
  }
  if (group.length) groups.push(group);
  return groups.slice(0, 3).map(samples => {
    const moonIllumination = Math.round(100 * Illumination(Body.Moon, samples[Math.floor(samples.length / 2)].time).phase_fraction);
    const targets: TargetWindow[] = [];
    for (const target of TARGETS) {
      let visible: VisibleSample[] = [];
      const windows: TargetWindow[] = [];
      const flush = () => {
        if (visible.length >= 3) {
          const summary = cloudSummary(visible);
          const sampleScore = (s: VisibleSample) => s.altitude - (s.cloud ?? 40) * .7 -
            (target.body || s.moonAltitude < 0 ? 0 : moonIllumination * Math.max(0, 1 - s.moonSeparation / 120) * .5);
          const best = visible.reduce((a, b) => sampleScore(b) > sampleScore(a) ? b : a);
          windows.push({ id: target.id, name: target.name, kind: target.kind, sizeArcmin: target.sizeArcmin,
            start: visible[0].time, end: new Date(+visible[visible.length - 1].time + STEP), best: best.time,
            altitude: best.altitude, azimuth: best.azimuth, ...summary, moonSeparation: best.moonSeparation, moonAltitude: best.moonAltitude,
            score: sampleScore(best) + Math.min(visible.length, 12) });
        }
        visible = [];
      };
      for (const sample of samples) {
        const eq = target.body ? Equator(target.body, sample.time, observer, true, true) :
          EquatorFromVector(RotateVector(Rotation_EQJ_EQD(sample.time),
            VectorFromSphere(new Spherical(target.dec!, target.ra! * 15, 1), sample.time)));
        const hz = Horizon(sample.time, observer, eq.ra, eq.dec, 'normal');
        if (!insidePorch(hz.azimuth, hz.altitude, porch) || (sample.cloud !== null && sample.cloud > 70)) { flush(); continue; }
        visible.push({ time: sample.time, altitude: hz.altitude, azimuth: hz.azimuth, cloud: sample.cloud,
          moonSeparation: separation(eq.ra, eq.dec, sample.moonRa, sample.moonDec), moonAltitude: sample.moonAltitude });
      }
      flush();
      windows.sort((a, b) => b.score - a.score);
      if (windows[0]) targets.push(windows[0]);
    }
    return { start: samples[0].time, end: new Date(+samples[samples.length - 1].time + STEP), ...cloudSummary(samples), moonIllumination,
      targets: targets.sort((a, b) => b.score - a.score).slice(0, 3) };
  });
}
