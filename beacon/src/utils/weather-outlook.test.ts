import { describe, expect, it } from 'vitest';
import { celsius, clothingAdvice, nightClouds } from './weather-outlook';

describe('family weather advice', () => {
  it('converts freezing temperatures and respects missing units/data', () => {
    expect(celsius(32, '°F')).toBe(0);
    expect(celsius(0, '°C')).toBe(0);
    expect(celsius(32, '')).toBeUndefined();
    expect(clothingAdvice({ datetime: '', temperature: 45, templow: 30, precipitation_probability: 70 }, '°F')).toContain('hat and gloves');
    expect(clothingAdvice({ datetime: '', temperature: 45, templow: 30, precipitation_probability: 70 }, '°F')).toContain('raincoat');
    expect(clothingAdvice(undefined, '°F')).toContain('unavailable');
  });
  it('suggests layers for changing temperatures and winter boots for snow', () => {
    const advice = clothingAdvice({ datetime: '', temperature: 28, templow: 8 }, '°C');
    expect(advice).toContain('jacket');
    expect(advice).toContain('Light clothes');
    expect(clothingAdvice({ datetime: '', condition: 'snowy' }, '°C')).toContain('boots');
  });
});

describe('night cloud forecast', () => {
  const day = new Date(2026, 10, 8, 12);
  const hour = (h: number, cloud?: number) => ({ datetime: new Date(2026, 10, 8, h).toISOString(), cloud_coverage: cloud });
  it('includes evening and next morning while excluding daytime and next evening', () => {
    const result = nightClouds(day, [hour(12, 100), hour(18, 10), hour(25, 30), hour(30, 100), hour(42, 100)], day);
    expect(result).toEqual({ cloud: 20, hours: 2, complete: false });
  });
  it('does not count missing, invalid, or duplicate values as clear hours', () => {
    expect(nightClouds(day, [hour(18), hour(19, -1), hour(20, NaN), hour(21, 101)], day).cloud).toBeNull();
    expect(nightClouds(day, [hour(18, 0), hour(18, 0)], day).hours).toBe(1);
  });
  it('recognizes full coverage and excludes hours that have already passed', () => {
    const hours = Array.from({ length: 12 }, (_, i) => hour(18 + i, i < 2 ? 100 : 0));
    expect(nightClouds(day, hours, day).complete).toBe(true);
    expect(nightClouds(day, hours, new Date(2026, 10, 8, 20))).toEqual({ cloud: 0, hours: 10, complete: true });
  });
});

import { compactClothingAdvice, nightCloudHours } from './weather-outlook';
describe('compact weather details', () => {
  it('does not repeat jacket advice and keeps cold mornings and precipitation visible', () => {
    expect(compactClothingAdvice({ datetime: '', temperature: 64, templow: 44 }, '°F')).toBe('Long sleeves & jacket');
    expect(compactClothingAdvice({ datetime: '', temperature: 69, templow: 44 }, '°F')).toBe('Light layers · Jacket early/late');
    expect(compactClothingAdvice({ datetime: '', temperature: 45, templow: 28, precipitation_probability: 60 }, '°F')).toBe('Coat, hat & gloves · Raincoat');
  });
  it('sorts real overnight hourly values, preserves gaps, and filters out daytime', () => {
    const day = new Date(2026, 10, 8, 12);
    const hour = (h: number, cloud?: number) => ({ datetime: new Date(2026, 10, 8, h).toISOString(), cloud_coverage: cloud });
    const hours = nightCloudHours(day, [hour(25, 60), hour(18, 0), hour(19), hour(12, 10), hour(30, 100)], day);
    expect(hours.map(h => h.cloud)).toEqual([0, null, 60]);
    expect(hours.map(h => h.time.getHours())).toEqual([18, 19, 1]);
  });
});
