import { describe, it, expect } from 'vitest';
import { computeMastery } from './Dashboard.jsx';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

function srs(over = {}) {
  return {
    cardId: 'c',
    deckId: 'd',
    interval: 0,
    easeFactor: 2.5,
    reps: 0,
    lapses: 0,
    lastReviewed: 0,
    due: NOW,
    ...over
  };
}

describe('computeMastery', () => {
  it('returns all-zero buckets for empty input', () => {
    expect(computeMastery([], NOW)).toEqual({ new: 0, learning: 0, mastered: 0, overdue: 0 });
  });

  it('puts never-reviewed cards in `new`', () => {
    const list = [srs(), srs({ cardId: 'x', lastReviewed: 0, reps: 0 })];
    const r = computeMastery(list, NOW);
    expect(r.new).toBe(2);
    expect(r.learning + r.mastered + r.overdue).toBe(0);
  });

  it('classifies a card with interval >= 7 as mastered', () => {
    const r = computeMastery([srs({ lastReviewed: 1, interval: 7, due: NOW + 10 * DAY })], NOW);
    expect(r.mastered).toBe(1);
    expect(r.learning).toBe(0);
    expect(r.overdue).toBe(0);
  });

  it('classifies a card with interval < 7 and not overdue as learning', () => {
    const r = computeMastery([srs({ lastReviewed: 1, interval: 3, due: NOW + DAY })], NOW);
    expect(r.learning).toBe(1);
    expect(r.mastered).toBe(0);
    expect(r.overdue).toBe(0);
  });

  it('classifies a card overdue by 1+ day as overdue, NOT learning', () => {
    // The pre-fix bug: this used to also be counted as learning (double-count).
    // The function's "overdue" semantic is "past due by 1+ day".
    const r = computeMastery([srs({ lastReviewed: 1, interval: 3, due: NOW - 2 * DAY })], NOW);
    expect(r.overdue).toBe(1);
    expect(r.learning).toBe(0);
  });

  it('classifies a card with interval >= 7 but past-due as overdue, NOT mastered', () => {
    const r = computeMastery([srs({ lastReviewed: 1, interval: 30, due: NOW - 2 * DAY })], NOW);
    expect(r.overdue).toBe(1);
    expect(r.mastered).toBe(0);
  });

  it('a card only just past due is still learning, not yet overdue', () => {
    // The threshold is "1+ day late" — within the first day of being late,
    // it stays in its interval-based bucket.
    const r = computeMastery([srs({ lastReviewed: 1, interval: 3, due: NOW - DAY / 2 })], NOW);
    expect(r.learning).toBe(1);
    expect(r.overdue).toBe(0);
  });

  it('buckets are mutually exclusive and sum to total', () => {
    const list = [
      srs({ cardId: 'a' }),                                                       // new
      srs({ cardId: 'b', lastReviewed: 1, interval: 3, due: NOW + DAY }),        // learning
      srs({ cardId: 'c', lastReviewed: 1, interval: 14, due: NOW + 7 * DAY }),    // mastered
      srs({ cardId: 'd', lastReviewed: 1, interval: 3, due: NOW - 2 * DAY }),    // overdue
      srs({ cardId: 'e', lastReviewed: 1, interval: 30, due: NOW - 2 * DAY })    // overdue (not mastered)
    ];
    const r = computeMastery(list, NOW);
    expect(r.new).toBe(1);
    expect(r.learning).toBe(1);
    expect(r.mastered).toBe(1);
    expect(r.overdue).toBe(2);
    expect(r.new + r.learning + r.mastered + r.overdue).toBe(list.length);
  });
});
