import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenSaver } from './ScreenSaver';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const time = (hours: number, minutes = 0) => vi.setSystemTime(new Date(2026, 9, 18, hours, minutes));
const tick = (ms = 1000) => act(() => { vi.advanceTimersByTime(ms); });
const active = () => document.querySelector('.screensaver-overlay') !== null;

describe('screensaver schedule', () => {
  it('starts at midnight, allows touch wake, resumes after idle, and ends at seven', () => {
    time(23, 59);
    render(<ScreenSaver scheduleEnabled />);
    expect(active()).toBe(false);
    tick(60_000);
    expect(active()).toBe(true);
    fireEvent.touchStart(window);
    expect(active()).toBe(false);
    tick(600_000);
    expect(active()).toBe(true);
    time(7);
    tick();
    expect(active()).toBe(false);
    expect(document.querySelector('.screensaver-dim')).toBeNull();
  });

  it('handles a window crossing midnight and excludes its end', () => {
    time(23);
    render(<ScreenSaver scheduleEnabled scheduleStart="22:00" scheduleEnd="06:00" />);
    expect(active()).toBe(true);
    time(1); tick();
    expect(active()).toBe(true);
    time(6); tick();
    expect(active()).toBe(false);
  });

  it('keeps daytime awake and treats equal or invalid times as an empty window', () => {
    time(12);
    const { rerender } = render(<ScreenSaver scheduleEnabled />);
    tick(3_600_000);
    expect(active()).toBe(false);
    rerender(<ScreenSaver scheduleEnabled scheduleStart="12:00" scheduleEnd="12:00" />);
    expect(active()).toBe(false);
    rerender(<ScreenSaver scheduleEnabled scheduleStart="invalid" />);
    expect(active()).toBe(false);
  });

  it('preserves ordinary idle behavior with the schedule off and respects disabled screensaver', () => {
    time(12);
    const { rerender } = render(<ScreenSaver />);
    tick(600_000);
    expect(active()).toBe(true);
    rerender(<ScreenSaver enabled={false} scheduleEnabled />);
    expect(active()).toBe(false);
  });

  it('applies edited daytime hours immediately', () => {
    time(12);
    const { rerender } = render(<ScreenSaver scheduleEnabled />);
    expect(active()).toBe(false);
    rerender(<ScreenSaver scheduleEnabled scheduleStart="11:00" scheduleEnd="13:00" />);
    expect(active()).toBe(true);
    rerender(<ScreenSaver scheduleEnabled scheduleStart="14:00" scheduleEnd="15:00" />);
    expect(active()).toBe(false);
  });
});
