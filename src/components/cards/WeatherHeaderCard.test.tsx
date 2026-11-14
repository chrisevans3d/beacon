import { cleanup, render, screen, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherHeaderCard } from './WeatherHeaderCard';
import { CardPickerModal } from './CardPickerModal';
import { useFamilyWeather } from '../../hooks/useFamilyWeather';
import type { DashboardCardContext } from '../../types/dashboard-cards';
import type { WeatherForecast } from '../../utils/weather-outlook';
const mock = vi.hoisted(() => ({ data: {
  daily: [] as WeatherForecast[], hourly: [] as WeatherForecast[], unit: '°F',
  current: { temperature: 42, condition: 'clear-night' },
  loading: false, error: null as string | null, updated: null,
} }));
vi.mock('../../hooks/useFamilyWeather', () => ({ useFamilyWeather: vi.fn(() => mock.data) }));
const context = { now: new Date(2026, 10, 8, 12) } as DashboardCardContext;
beforeEach(() => { mock.data.daily = []; mock.data.hourly = []; mock.data.error = null; mock.data.loading = false; });
afterEach(cleanup);

describe('header weather and night sky', () => {
  it('is available in the header picker and leaves the detailed card in the main picker', () => {
    const { unmount } = render(<CardPickerModal region="topbar" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Weather & Night Sky — Header/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Family Weather & Night Sky/ })).toBeNull();
    unmount();
    render(<CardPickerModal region="main" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Family Weather & Night Sky/ })).toBeTruthy();
  });
  it('shows actual current temperature, true zero clouds, partial coverage and missing nights', () => {
    mock.data.daily = [{ datetime: '2026-11-08', templow: 30 }];
    mock.data.hourly = [{ datetime: new Date(2026, 10, 8, 18).toISOString(), cloud_coverage: 0 }];
    render(<WeatherHeaderCard config={{ entity_id: 'weather.porch' }} context={context} />);
    expect(vi.mocked(useFamilyWeather)).toHaveBeenLastCalledWith('weather.porch');
    expect(screen.getByText(/42°F/)).toBeTruthy();
    const nights = screen.getAllByRole('listitem');
    expect(nights).toHaveLength(3);
    expect(within(nights[0]).getByText(/0%/)).toBeTruthy();
    expect(within(nights[0]).getByText('Partial')).toBeTruthy();
    expect(screen.getByLabelText('Tonight: freeze forecast')).toBeTruthy();
    expect(screen.getAllByText('No cloud data')).toHaveLength(2);
    expect(screen.queryByText('Hourly cloud cover')).toBeNull();
  });
  it('does not mark full night coverage as partial', () => {
    mock.data.hourly = Array.from({ length: 12 }, (_, i) => ({ datetime: new Date(2026, 10, 8, 18 + i).toISOString(), cloud_coverage: 25 }));
    render(<WeatherHeaderCard config={{}} context={context} />);
    expect(screen.getByText(/25%/)).toBeTruthy();
    expect(screen.queryByText('Partial')).toBeNull();
  });
  it('shows provider failures and loading without implying clear skies', () => {
    mock.data.loading = true;
    const { rerender } = render(<WeatherHeaderCard config={{}} context={context} />);
    expect(screen.getByRole('status').textContent).toBe('Loading weather…');
    mock.data.loading = false; mock.data.error = 'Weather provider unavailable';
    rerender(<WeatherHeaderCard config={{}} context={context} />);
    expect(screen.getByRole('status').textContent).toBe('Weather provider unavailable');
    expect(screen.queryByRole('list')).toBeNull();
  });
});
