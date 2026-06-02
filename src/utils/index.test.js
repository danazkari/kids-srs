import { describe, it, expect } from 'vitest';
import {
  uuid,
  todayIso,
  startOfDay,
  daysBetween,
  clamp,
  shuffle,
  formatDuration,
  pluralize
} from './index.js';

describe('uuid', () => {
  it('returns a string', () => {
    expect(typeof uuid()).toBe('string');
  });
  it('returns unique values', () => {
    const a = new Set();
    for (let i = 0; i < 100; i++) a.add(uuid());
    expect(a.size).toBe(100);
  });
  it('matches UUID v4 shape', () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('todayIso', () => {
  it('formats YYYY-MM-DD', () => {
    const d = new Date(2024, 0, 5);
    expect(todayIso(d)).toBe('2024-01-05');
  });
  it('zero-pads month and day', () => {
    const d = new Date(2024, 8, 9);
    expect(todayIso(d)).toBe('2024-09-09');
  });
  it('defaults to today', () => {
    expect(todayIso()).toBe(todayIso(new Date()));
  });
});

describe('startOfDay', () => {
  it('zeroes time', () => {
    const noon = new Date(2024, 5, 15, 14, 30, 45, 123).getTime();
    const sod = startOfDay(noon);
    const d = new Date(sod);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getDate()).toBe(15);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween(0, 3 * 86_400_000)).toBe(3);
  });
  it('rounds toward zero', () => {
    expect(daysBetween(0, 86_400_000 * 0.5)).toBe(0);
  });
});

describe('clamp', () => {
  it('returns the value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it('clamps above', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('shuffle', () => {
  it('preserves length and elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const s = shuffle(arr);
    expect(s).toHaveLength(5);
    expect([...s].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
  it('does not mutate input', () => {
    const arr = [1, 2, 3];
    const before = [...arr];
    shuffle(arr);
    expect(arr).toEqual(before);
  });
  it('handles empty and single-element input', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
  });
});

describe('formatDuration', () => {
  it('handles 0', () => {
    expect(formatDuration(0)).toBe('0m');
  });
  it('formats minutes only', () => {
    expect(formatDuration(120)).toBe('2m');
  });
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });
  it('formats both', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });
});

describe('pluralize', () => {
  it('handles singular', () => {
    expect(pluralize(1, 'card')).toBe('1 card');
  });
  it('handles plural', () => {
    expect(pluralize(2, 'card')).toBe('2 cards');
  });
  it('accepts explicit plural', () => {
    expect(pluralize(1, 'child', 'children')).toBe('1 child');
    expect(pluralize(2, 'child', 'children')).toBe('2 children');
  });
});
