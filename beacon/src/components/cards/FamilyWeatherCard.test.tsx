import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyWeatherCard } from './FamilyWeatherCard';
import type { DashboardCardContext } from '../../types/dashboard-cards';

const mock = vi.hoisted(() => ({ data: { daily: [] as unknown[], hourly: [] as unknown[], unit: '°F', loading: false, error: null as string | null, updated: null } }));
vi.mock('../../hooks/useFamilyWeather', () => ({ useFamilyWeather: () => mock.data }));
vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key, dateLocale: undefined }) }));
beforeEach(() => { mock.data.daily = []; mock.data.hourly = []; mock.data.error = null; });
afterEach(cleanup);
const context = { now: new Date(2026, 10, 8, 12) } as DashboardCardContext;

describe('FamilyWeatherCard', () => {
  it('shows freeze and clothing guidance alongside missing sky data', () => {
    mock.data.daily = [{ datetime: '2026-11-08', temperature: 45, templow: 30, precipitation_probability: 60 }];
    render(<FamilyWeatherCard config={{}} context={context} />);
    expect(screen.getByText(/Freeze forecast/)).toBeTruthy();
    expect(screen.getByText(/Coat, hat & gloves/)).toBeTruthy();
    expect(screen.getAllByText('Hourly cloud cover unavailable')).toHaveLength(3);
    expect(screen.queryByText(/Least cloudy/)).toBeNull();
  });
  it('labels the night average separately from expandable hourly values, including missing data', () => {
    mock.data.hourly = [
      { datetime: new Date(2026, 10, 8, 18).toISOString(), cloud_coverage: 0 },
      { datetime: new Date(2026, 10, 8, 19).toISOString(), cloud_coverage: 80 },
      { datetime: new Date(2026, 10, 8, 20).toISOString() },
    ];
    const { container } = render(<FamilyWeatherCard config={{}} context={context} />);
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText(/Partial forecast/)).toBeTruthy();
    expect(container.querySelector('meter')).toBeNull();
    const summary = screen.getByText('Hourly cloud cover');
    fireEvent.click(summary);
    expect(summary.closest('details')?.open).toBe(true);
    expect(screen.getByText('0% clouds')).toBeTruthy();
    expect(screen.getByText('80% clouds')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.queryByText(/Least cloudy night/)).toBeNull();
  });
  it('shows connection failures without suggesting clear skies', () => {
    mock.data.error = 'Connect Home Assistant to load weather forecasts.';
    render(<FamilyWeatherCard config={{}} context={context} />);
    expect(screen.getByRole('status').textContent).toContain('Connect Home Assistant');
    expect(screen.queryByText(/Mostly clear/)).toBeNull();
    mock.data.error = null;
  });
});
