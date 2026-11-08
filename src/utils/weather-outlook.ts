export interface WeatherForecast {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation_probability?: number;
  cloud_coverage?: number;
}

export function celsius(value: number | undefined, unit: string): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (unit === '°F') return (value - 32) * 5 / 9;
  return unit === '°C' ? value : undefined;
}

export function clothingAdvice(day: WeatherForecast | undefined, unit: string): string {
  if (!day) return 'Clothing outlook unavailable';
  const low = celsius(day.templow, unit);
  const high = celsius(day.temperature, unit);
  const suggestions: string[] = [];
  if (low !== undefined && low <= 0) suggestions.push('Warm coat, hat and gloves for cold hours');
  else if (low !== undefined && low < 10) suggestions.push('Bring a jacket for cool hours');
  if (high !== undefined) {
    if (high >= 27) suggestions.push('Light clothes; bring water');
    else if (high >= 18) suggestions.push('Light layers for daytime');
    else if (high >= 10) suggestions.push('Long sleeves and a jacket');
    else suggestions.push('Warm layers for daytime');
  }
  if ((typeof day.precipitation_probability === 'number' && day.precipitation_probability >= 40) ||
      ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy'].includes(day.condition ?? '')) {
    suggestions.push('Pack a raincoat and water-resistant shoes');
  }
  if (day.condition === 'snowy') suggestions.push('Winter coat and boots');
  return suggestions.join(' · ') || 'Clothing outlook unavailable';
}

/** A planning window, not a calculation of astronomical darkness. Only future hours count. */
export function nightClouds(day: Date, hourly: WeatherForecast[], now: Date) {
  const start = new Date(day); start.setHours(18, 0, 0, 0);
  const end = new Date(day); end.setDate(end.getDate() + 1); end.setHours(6, 0, 0, 0);
  const from = Math.max(start.getTime(), now.getTime());
  const samples = new Map<number, number>();
  for (const hour of hourly) {
    const time = Date.parse(hour.datetime);
    const cloud = hour.cloud_coverage;
    if (time >= from && time < end.getTime() && typeof cloud === 'number' &&
        Number.isFinite(cloud) && cloud >= 0 && cloud <= 100) samples.set(time, cloud);
  }
  const values = [...samples.values()];
  const expected = Math.max(1, Math.ceil((end.getTime() - from) / 3_600_000));
  const complete = values.length >= expected;
  return { cloud: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    hours: values.length, complete };
}

/** Short clothing guidance for the at-a-glance dashboard. */
export function compactClothingAdvice(day: WeatherForecast | undefined, unit: string): string {
  if (!day) return 'Clothing outlook unavailable';
  const low = celsius(day.templow, unit);
  const high = celsius(day.temperature, unit);
  let advice = low !== undefined && low <= 0 ? 'Coat, hat & gloves' :
    high !== undefined && high < 10 ? 'Warm layers & coat' :
    high !== undefined && high < 18 ? 'Long sleeves & jacket' :
    high !== undefined && high >= 27 ? 'Light clothes & water' :
    high !== undefined ? 'Light layers' : 'Clothing outlook unavailable';
  if (low !== undefined && low > 0 && low < 10 && high !== undefined && high >= 18) advice += ' · Jacket early/late';
  if ((day.precipitation_probability ?? 0) >= 40 || ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy'].includes(day.condition ?? '')) advice += ' · Raincoat';
  if (day.condition === 'snowy') advice += ' · Winter boots';
  return advice;
}

/** Retain missing cloud values as gaps in the hourly detail. */
export function nightCloudHours(day: Date, hourly: WeatherForecast[], now: Date) {
  const start = new Date(day); start.setHours(18, 0, 0, 0);
  const end = new Date(day); end.setDate(end.getDate() + 1); end.setHours(6, 0, 0, 0);
  const from = Math.max(start.getTime(), now.getTime());
  const hours = new Map<number, number | null>();
  for (const hour of hourly) {
    const time = Date.parse(hour.datetime);
    if (time < from || time >= +end || !Number.isFinite(time)) continue;
    const cloud = hour.cloud_coverage;
    hours.set(time, typeof cloud === 'number' && Number.isFinite(cloud) && cloud >= 0 && cloud <= 100 ? cloud : null);
  }
  return [...hours].sort(([a], [b]) => a - b).map(([time, cloud]) => ({ time: new Date(time), cloud }));
}
