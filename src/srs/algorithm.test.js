import { describe, it, expect } from 'vitest';
import {
  newSrsState,
  applyGrade,
  GRADE,
  MIN_EASE,
  checkSpelling,
  letterCompare
} from './algorithm.js';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

describe('newSrsState', () => {
  it('creates a state with sensible defaults', () => {
    const s = newSrsState('c1', 'd1', NOW);
    expect(s).toEqual({
      cardId: 'c1',
      deckId: 'd1',
      interval: 0,
      easeFactor: 2.5,
      due: NOW,
      reps: 0,
      lapses: 0,
      lastReviewed: 0
    });
  });
});

describe('applyGrade', () => {
  it('FAIL resets reps, sets interval to 1 day, drops ease, increments lapses', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 10, easeFactor: 2.5, reps: 5, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.FAIL, NOW);
    expect(next.reps).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.3);
    expect(next.lapses).toBe(1);
    expect(next.due).toBe(NOW + DAY);
    expect(next.lastReviewed).toBe(NOW);
  });

  it('FAIL respects the MIN_EASE floor', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 1, easeFactor: MIN_EASE, reps: 0, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.FAIL, NOW);
    expect(next.easeFactor).toBe(MIN_EASE);
  });

  it('ALMOST grows interval by 1.2x and drops ease slightly', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 10, easeFactor: 2.5, reps: 1, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.ALMOST, NOW);
    expect(next.interval).toBe(12);
    expect(next.easeFactor).toBeCloseTo(2.45);
    expect(next.reps).toBe(2);
    expect(next.due).toBe(NOW + 12 * DAY);
  });

  it('ALMOST floors interval at 1 day for tiny intervals', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 0, easeFactor: 2.5, reps: 0, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.ALMOST, NOW);
    expect(next.interval).toBe(1);
  });

  it('PASS first rep sets interval to 1 day', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 0, easeFactor: 2.5, reps: 0, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.PASS, NOW);
    expect(next.reps).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.due).toBe(NOW + DAY);
  });

  it('PASS second rep sets interval to 3 days', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 1, easeFactor: 2.5, reps: 1, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.PASS, NOW);
    expect(next.reps).toBe(2);
    expect(next.interval).toBe(3);
    expect(next.due).toBe(NOW + 3 * DAY);
  });

  it('PASS third+ rep multiplies interval by ease (rounded)', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 3, easeFactor: 2.5, reps: 2, lapses: 0, lastReviewed: 0 };
    const next = applyGrade(s, GRADE.PASS, NOW);
    expect(next.reps).toBe(3);
    expect(next.interval).toBe(8);
    expect(next.due).toBe(NOW + 8 * DAY);
  });

  it('does not mutate input', () => {
    const s = { cardId: 'c', deckId: 'd', interval: 1, easeFactor: 2.5, reps: 1, lapses: 0, lastReviewed: 0 };
    const before = { ...s };
    applyGrade(s, GRADE.PASS, NOW);
    expect(s).toEqual(before);
  });
});

describe('checkSpelling', () => {
  it('matches exact input', () => {
    expect(checkSpelling('cat', 'cat')).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(checkSpelling('Cat', 'CAT')).toBe(true);
    expect(checkSpelling('CAT', 'cat')).toBe(true);
  });
  it('trims and collapses whitespace', () => {
    expect(checkSpelling('  cat  ', 'cat')).toBe(true);
    expect(checkSpelling('hello world', 'hello  world')).toBe(true);
  });
  it('ignores diacritics (NFD-decomposed)', () => {
    expect(checkSpelling('cafe', 'café')).toBe(true);
    expect(checkSpelling('a', 'à')).toBe(true);
  });
  it('rejects different words', () => {
    expect(checkSpelling('cat', 'dog')).toBe(false);
    expect(checkSpelling('cat', 'cats')).toBe(false);
  });
  it('rejects empty user input as not equal to a non-empty answer', () => {
    expect(checkSpelling('', 'cat')).toBe(false);
  });
});

describe('letterCompare', () => {
  it('marks all chars correct when matching', () => {
    const r = letterCompare('cat', 'cat');
    expect(r).toEqual([
      { char: 'c', status: 'correct' },
      { char: 'a', status: 'correct' },
      { char: 't', status: 'correct' }
    ]);
  });
  it('marks wrong positions as wrong', () => {
    const r = letterCompare('cot', 'cat');
    expect(r[1]).toEqual({ char: 'a', status: 'wrong' });
  });
  it('marks missing trailing chars', () => {
    const r = letterCompare('ca', 'cat');
    expect(r[2]).toEqual({ char: 't', status: 'missing' });
  });
  it('ignores extra input characters beyond the answer length', () => {
    const r = letterCompare('cats', 'cat');
    expect(r).toHaveLength(3);
  });
  it('is diacritic-insensitive', () => {
    const r = letterCompare('cafe', 'café');
    expect(r[3]).toEqual({ char: 'é', status: 'correct' });
  });
});
