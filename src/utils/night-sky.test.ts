import { describe, expect, it } from 'vitest';
import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import { buildNightSkyPlan, cloudAt, DEFAULT_PORCH, insidePorch, readPorch, targetPosition } from './night-sky';
import { parseObservingSite } from '../hooks/useObservingSite';
const site = { latitude: 35.78, longitude: -78.64, elevation: 100, timeZone: 'America/New_York' };

describe('observing site and porch view', () => {
  it('uses HA location, accepts equatorial/prime-meridian zero and rejects partial/invalid overrides', () => {
    expect(parseObservingSite({}, { ...site, time_zone: site.timeZone })).toMatchObject({ latitude: 35.78, longitude: -78.64 });
    expect(parseObservingSite({ latitude: '0', longitude: '0' }, null)).toMatchObject({ latitude: 0, longitude: 0 });
    expect(() => parseObservingSite({ latitude: '35' }, null)).toThrow(/both/);
    expect(() => parseObservingSite({ latitude: '91', longitude: '0' }, null)).toThrow(/Location unavailable/);
    expect(() => parseObservingSite({}, null)).toThrow(/Location unavailable/);
  });
  it('supports west to NNW, north-crossing views and the full sky with elevation limits', () => {
    expect(readPorch({})).toEqual(DEFAULT_PORCH);
    expect(insidePorch(300, 40, DEFAULT_PORCH)).toBe(true);
    expect(insidePorch(350, 40, DEFAULT_PORCH)).toBe(false);
    expect(insidePorch(300, 15, DEFAULT_PORCH)).toBe(false);
    const north = { ...DEFAULT_PORCH, azimuthStart: 330, azimuthEnd: 30 };
    expect(insidePorch(0, 40, north)).toBe(true);
    expect(insidePorch(180, 40, north)).toBe(false);
    expect(insidePorch(180, 40, { ...north, azimuthStart: 0, azimuthEnd: 360 })).toBe(true);
    expect(() => readPorch({ min_altitude: '90', max_altitude: '25' })).toThrow();
    expect(() => readPorch({ azimuth_start: 'wrong' })).toThrow();
  });
  it('does not extend forecast hours or treat unknown values as clear', () => {
    const forecast = [{ datetime: '2026-11-15T01:00:00Z', cloud_coverage: 0 }];
    expect(cloudAt(new Date('2026-11-15T01:30:00Z'), forecast)).toBe(0);
    expect(cloudAt(new Date('2026-11-15T02:00:00Z'), forecast)).toBeNull();
    expect(cloudAt(new Date('2026-11-15T00:59:00Z'), forecast)).toBeNull();
  });
});

describe('astronomical target calculations', () => {
  it('places Polaris near the observer’s latitude and north, including precession', () => {
    const position = targetPosition({ ra: 2.5303, dec: 89.2641 }, new Date('2026-11-15T02:00:00Z'), site);
    expect(position.altitude).toBeGreaterThan(site.latitude - 1);
    expect(position.altitude).toBeLessThan(site.latitude + 1);
    expect(Math.min(position.azimuth, 360 - position.azimuth)).toBeLessThan(2);
  });
  it('finds local dark windows and only recommends targets within the porch view and darkness', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    const nights = buildNightSkyPlan(now, site, DEFAULT_PORCH, []);
    expect(nights).toHaveLength(3);
    expect(nights.some(n => n.targets.length)).toBe(true);
    const observer = new Observer(site.latitude, site.longitude, site.elevation);
    for (const night of nights) {
      expect(night.cloud).toBeNull(); expect(night.coverage).toBe(0);
      for (const target of night.targets) {
        expect(+target.start).toBeGreaterThanOrEqual(+now);
        expect(+target.end - +target.start).toBeGreaterThanOrEqual(30 * 60_000);
        expect(insidePorch(target.azimuth, target.altitude, DEFAULT_PORCH)).toBe(true);
        expect(+target.best).toBeGreaterThanOrEqual(+target.start);
        expect(+target.best).toBeLessThan(+target.end);
        const sun = Equator(Body.Sun, target.best, observer, true, true);
        expect(Horizon(target.best, observer, sun.ra, sun.dec).altitude).toBeLessThan(-18);
        expect(target.moonSeparation).toBeGreaterThanOrEqual(0);
        expect(target.moonSeparation).toBeLessThanOrEqual(180);
      }
    }
  });
  it('does not recommend targets behind known heavy cloud cover', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    const hours = Array.from({ length: 73 }, (_, i) => ({ datetime: new Date(+now + i * 3_600_000).toISOString(), cloud_coverage: 100 }));
    const nights = buildNightSkyPlan(now, site, DEFAULT_PORCH, hours);
    expect(nights.every(n => n.cloud === 100 && n.coverage === 100 && n.targets.length === 0)).toBe(true);
  });
  it('reports no astronomical darkness in polar summer rather than inventing windows', () => {
    const nights = buildNightSkyPlan(new Date('2026-06-21T12:00:00Z'), { latitude: 78, longitude: 15, elevation: 0, timeZone: 'Arctic/Longyearbyen' }, DEFAULT_PORCH, []);
    expect(nights).toEqual([]);
  });
});
