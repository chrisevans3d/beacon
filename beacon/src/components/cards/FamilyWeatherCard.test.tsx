import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FamilyWeatherCard } from './FamilyWeatherCard';
import type { DashboardCardContext } from '../../types/dashboard-cards';

const mock = vi.hoisted(() => ({ data: { daily: [] as unknown[], hourly: [] as unknown[], unit: '°F', loading: false, error: null as string | null, updated: null } }));
vi.mock('../../hooks/useFamilyWeather', () => ({ useFamilyWeather: () => mock.data }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key, dateLocale: undefined }) }));
afterEach(cleanup);
const context = { now: new Date(2026, 10, 8, 12) } as DashboardCardContext;

describe('FamilyWeatherCard', () => {
  it('shows freeze and clothing guidance alongside missing sky data', () => {
    mock.data.daily = [{ datetime: '2026-11-08', temperature: 45, templow: 30, precipitation_probability: 60 }];
    render(<FamilyWeatherCard config={{}} context={context} />);
    expect(screen.getByText(/Freeze forecast/)).toBeTruthy();
    expect(screen.getByText(/Warm coat, hat and gloves/)).toBeTruthy();
    expect(screen.getAllByText('Hourly cloud cover unavailable')).toHaveLength(3);
    expect(screen.queryByText(/Least cloudy/)).toBeNull();
  });
  it('shows connection failures without suggesting clear skies', () => {
    mock.data.error = 'Connect Home Assistant to load weather forecasts.';
    render(<FamilyWeatherCard config={{}} context={context} />);
    expect(screen.getByRole('status').textContent).toContain('Connect Home Assistant');
    expect(screen.queryByText(/Mostly clear/)).toBeNull();
    mock.data.error = null;
  });
});
