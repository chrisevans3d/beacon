import { useEffect, useState } from 'react';
import { callHaService, haFetch, hasToken } from '../api/ha-rest';
import { getConfig } from '../config';
import type { WeatherForecast } from '../utils/weather-outlook';

interface Entity { entity_id: string; state: string; attributes: Record<string, unknown> }
interface Outlook {
  daily: WeatherForecast[]; hourly: WeatherForecast[]; unit: string;
  loading: boolean; error: string | null; updated: Date | null;
}
export function useFamilyWeather(configuredEntity: string) {
  const [data, setData] = useState<Outlook>({ daily: [], hourly: [], unit: '', loading: true, error: null, updated: null });
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        if (!hasToken()) throw new Error('Connect Home Assistant to load weather forecasts.');
        const id = configuredEntity || getConfig().weather_entity;
        let entity: Entity | undefined;
        if (id) {
          try { entity = await haFetch(`/api/states/${encodeURIComponent(id)}`) as Entity; }
          catch { if (configuredEntity) throw new Error('The selected weather entity is unavailable.'); }
        }
        if (!entity) {
          const states = await haFetch('/api/states') as Entity[];
          entity = states.find(s => s.entity_id.startsWith('weather.') && !['unavailable', 'unknown'].includes(s.state));
        }
        if (!entity || !entity.entity_id.startsWith('weather.') || ['unavailable', 'unknown'].includes(entity.state)) {
          throw new Error('No available weather entity found. Select one in the card settings.');
        }
        const entityId = entity.entity_id;
        const forecast = async (type: string) => {
          const result = await callHaService('weather', 'get_forecasts', { entity_id: entityId, type }, true) as
            { service_response?: Record<string, { forecast?: WeatherForecast[] }> } & Record<string, unknown>;
          const outer = result.service_response ?? result;
          const raw = (outer[entityId] as { forecast?: WeatherForecast[] } | undefined)?.forecast;
          return Array.isArray(raw) ? raw.filter(f => f && Number.isFinite(Date.parse(f.datetime))) : [];
        };
        const [daily, hourly] = await Promise.allSettled([forecast('daily'), forecast('hourly')]);
        if (!cancelled) setData({ daily: daily.status === 'fulfilled' ? daily.value : [],
          hourly: hourly.status === 'fulfilled' ? hourly.value : [],
          unit: typeof entity.attributes.temperature_unit === 'string' ? entity.attributes.temperature_unit : '',
          loading: false, error: daily.status === 'rejected' && hourly.status === 'rejected' ? 'This weather provider did not return daily or hourly forecasts.' : null,
          updated: new Date() });
      } catch (error) {
        if (!cancelled) setData({ daily: [], hourly: [], unit: '', loading: false,
          error: error instanceof Error ? error.message : 'Weather unavailable', updated: null });
      }
    }
    setData({ daily: [], hourly: [], unit: '', loading: true, error: null, updated: null });
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 30 * 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [configuredEntity]);
  return data;
}
