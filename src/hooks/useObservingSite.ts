import { useEffect, useState } from 'react';
import { haFetch, hasToken } from '../api/ha-rest';
import type { ObservingSite } from '../utils/night-sky';

export function parseObservingSite(config: Record<string, unknown>, ha: Record<string, unknown> | null): ObservingSite {
  const lat = String(config.latitude ?? '').trim(), lon = String(config.longitude ?? '').trim();
  if (!!lat !== !!lon) throw new Error('Enter both latitude and longitude, or leave both blank to use Home Assistant.');
  const latitude = lat ? Number(lat) : ha?.latitude;
  const longitude = lon ? Number(lon) : ha?.longitude;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new Error('Location unavailable. Use the card’s gear to enter latitude and longitude, or check Home Assistant’s location.');
  }
  const elevation = typeof ha?.elevation === 'number' && Number.isFinite(ha.elevation) ? ha.elevation : 0;
  const timeZone = typeof ha?.time_zone === 'string' ? ha.time_zone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  try { new Intl.DateTimeFormat('en', { timeZone }).format(); }
  catch { throw new Error('Home Assistant’s time zone is invalid.'); }
  return { latitude, longitude, elevation, timeZone };
}
export function useObservingSite(config: Record<string, unknown>) {
  const [state, setState] = useState<{ ha: Record<string, unknown> | null; loading: boolean }>({ ha: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let ha: Record<string, unknown> | null = null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try { if (hasToken()) ha = await haFetch('/api/config', { signal: controller.signal }) as Record<string, unknown>; } catch { /* manual coordinates remain usable */ }
      clearTimeout(timer);
      if (!cancelled) setState({ ha, loading: false });
    };
    void load();
    return () => { cancelled = true; };
  }, []);
  try { return { site: parseObservingSite(config, state.ha), loading: state.loading, error: null }; }
  catch (e) { return { site: null, loading: state.loading, error: e instanceof Error ? e.message : 'Location unavailable' }; }
}
