import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherHeaderCard } from './WeatherHeaderCard';
import { NightSkyCard } from './NightSkyCard';
import { CardPickerModal } from './CardPickerModal';
import { CardConfigModal } from './CardConfigModal';
import type { DashboardCardContext } from '../../types/dashboard-cards';
import type { SkyNight } from '../../utils/night-sky';
const mock = vi.hoisted(() => ({
  weather: { daily: [], hourly: [], unit: '°F', loading: false, error: null as string | null, updated: null },
  location: { site: { latitude: 35.78, longitude: -78.64, elevation: 100, timeZone: 'America/New_York' }, loading: false, error: null as string | null },
  nights: [] as SkyNight[],
}));
vi.mock('../../hooks/useFamilyWeather', () => ({ useFamilyWeather: () => mock.weather }));
vi.mock('../../hooks/useObservingSite', () => ({ useObservingSite: () => mock.location }));
vi.mock('../../utils/night-sky', async importOriginal => ({ ...await importOriginal<typeof import('../../utils/night-sky')>(), buildNightSkyPlan: () => mock.nights }));
const context = { now: new Date('2026-11-15T00:00:00Z'), timeFormat: '12h' } as DashboardCardContext;
beforeEach(() => { mock.nights = []; mock.location.error = null; mock.weather.error = null; mock.location.loading = false; });
afterEach(cleanup);
const fixture = (): SkyNight => ({ start: new Date('2026-11-15T01:00:00Z'), end: new Date('2026-11-15T11:00:00Z'), cloud: 10, coverage: 60, moonIllumination: 30,
  targets: [{ id: 'NGC0224', name: 'Andromeda Galaxy', kind: 'Galaxy', sizeArcmin: 177, start: new Date('2026-11-15T01:00:00Z'), end: new Date('2026-11-15T03:00:00Z'), best: new Date('2026-11-15T02:00:00Z'), altitude: 45, azimuth: 300, cloud: 0, coverage: 100, moonSeparation: 80, moonAltitude: 30, score: 90 }] });

describe('Night Sky cards', () => {
  it('keeps the upgraded widget in both pickers and preserves the weather-only alternative', () => {
    const { unmount } = render(<CardPickerModal region="topbar" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Night Sky — Header/ })).toBeTruthy();
    unmount();
    render(<CardPickerModal region="main" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Family Weather \(three-day forecast\)/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Night Sky/ })).toBeTruthy();
  });
  it('shows real target windows, best time in HA timezone, direction, cloud coverage and Moon information', () => {
    mock.nights = [fixture()];
    render(<NightSkyCard config={{}} context={context} />);
    expect(screen.getByText('Andromeda Galaxy')).toBeTruthy();
    expect(screen.getByText(/Best 9:00 PM · 45° up · NW/)).toBeTruthy();
    expect(screen.getByText(/Moon 30% lit/)).toBeTruthy();
    expect(screen.getByText(/Partial \(60% covered\)/)).toBeTruthy();
    expect(screen.getByText(/Porch 270°–340°/)).toBeTruthy();
    expect(screen.getByText(/^0% avg. clouds/)).toBeTruthy();
  });
  it('shows a target and best time in the compact header', () => {
    mock.nights = [fixture()];
    render(<WeatherHeaderCard config={{}} context={context} />);
    expect(screen.getByText('Andromeda Galaxy')).toBeTruthy();
    expect(screen.getByText(/Best 9:00 PM · NW/)).toBeTruthy();
    expect(screen.queryByText('How these suggestions work')).toBeNull();
  });
  it('does not invent location or targets if the location is missing', () => {
    mock.location.error = 'Location unavailable. Configure latitude and longitude.';
    render(<NightSkyCard config={{}} context={context} />);
    expect(screen.getByRole('alert').textContent).toContain('Location unavailable');
    expect(screen.queryByText('Andromeda Galaxy')).toBeNull();
  });
  it('still shows geometry-based targets if clouds are unknown and clearly labels them', () => {
    const night = fixture(); night.cloud = null; night.coverage = 0; night.targets[0].cloud = null;
    mock.nights = [night]; mock.weather.error = 'No forecast';
    render(<NightSkyCard config={{}} context={context} />);
    expect(screen.getByText('Cloud forecast unavailable')).toBeTruthy();
    expect(screen.getByText(/No cloud forecast — timing only/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('visibility only');
  });
  it('handles polar daylight without displaying false observing opportunities', () => {
    render(<NightSkyCard config={{}} context={context} />);
    expect(screen.getByText(/No astronomical darkness in the next 72 hours/)).toBeTruthy();
  });
  it('offers editable location and porch settings for an existing card with only an entity setting', () => {
    render(<CardConfigModal card={{ id: 'existing-weather', type: 'family-weather', config: { entity_id: '' }, size: 'lg' }} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Latitude (blank = Home Assistant)')).toBeTruthy();
    expect((screen.getByLabelText('Porch start bearing (0–360°, W = 270°)') as HTMLInputElement).value).toBe('270');
    expect((screen.getByLabelText('Porch end bearing (0–360°, N = 0°)') as HTMLInputElement).value).toBe('340');
  });
});
