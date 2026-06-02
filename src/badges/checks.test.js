import { describe, it, expect } from 'vitest';
import {
  evaluateFirstCardEver,
  evaluateFirstSession,
  evaluateStreak,
  evaluateSessionsInOneDay,
  evaluateCardsTotal,
  evaluatePerfectSession,
  evaluateFrenchFirst
} from './checks.js';
import { startOfDay } from '../utils/index.js';

const DAY = 86_400_000;

function isoOf(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayOffsetTs(offsetDays) {
  return startOfDay(Date.now()) - offsetDays * DAY;
}

describe('evaluateFirstCardEver', () => {
  it('triggers at 1+', () => {
    expect(evaluateFirstCardEver({ totalCardsReviewed: 0 })).toBe(false);
    expect(evaluateFirstCardEver({ totalCardsReviewed: 1 })).toBe(true);
    expect(evaluateFirstCardEver({ totalCardsReviewed: 100 })).toBe(true);
  });
});

describe('evaluateFirstSession', () => {
  it('triggers at 1+', () => {
    expect(evaluateFirstSession({ completedSessionCount: 0 })).toBe(false);
    expect(evaluateFirstSession({ completedSessionCount: 1 })).toBe(true);
  });
});

describe('evaluateStreak', () => {
  it('returns false if no completed dates', () => {
    expect(evaluateStreak({ completedDates: [] }, 1)).toBe(false);
  });
  it('returns false if last session was more than 1 day ago', () => {
    const dates = [isoOf(dayOffsetTs(2))];
    expect(evaluateStreak({ completedDates: dates }, 1)).toBe(false);
  });
  it('counts consecutive days ending today', () => {
    const dates = [isoOf(dayOffsetTs(0)), isoOf(dayOffsetTs(1)), isoOf(dayOffsetTs(2))];
    expect(evaluateStreak({ completedDates: dates }, 3)).toBe(true);
    expect(evaluateStreak({ completedDates: dates }, 4)).toBe(false);
  });
  it('counts ending yesterday if no session today', () => {
    const dates = [isoOf(dayOffsetTs(1)), isoOf(dayOffsetTs(2))];
    expect(evaluateStreak({ completedDates: dates }, 2)).toBe(true);
    expect(evaluateStreak({ completedDates: dates }, 3)).toBe(false);
  });
  it('returns false if there is a gap in the streak', () => {
    const dates = [isoOf(dayOffsetTs(0)), isoOf(dayOffsetTs(2))];
    expect(evaluateStreak({ completedDates: dates }, 2)).toBe(false);
  });
});

describe('evaluateSessionsInOneDay', () => {
  it('returns true if any day has enough sessions', () => {
    expect(evaluateSessionsInOneDay({ sessionsByDate: { '2024-01-01': 1 } }, 2)).toBe(false);
    expect(evaluateSessionsInOneDay({ sessionsByDate: { '2024-01-01': 2 } }, 2)).toBe(true);
    expect(evaluateSessionsInOneDay({ sessionsByDate: { a: 1, b: 3 } }, 3)).toBe(true);
  });
  it('handles empty input', () => {
    expect(evaluateSessionsInOneDay({ sessionsByDate: {} }, 1)).toBe(false);
  });
});

describe('evaluateCardsTotal', () => {
  it('compares against target', () => {
    expect(evaluateCardsTotal({ totalCardsReviewed: 9 }, 10)).toBe(false);
    expect(evaluateCardsTotal({ totalCardsReviewed: 10 }, 10)).toBe(true);
    expect(evaluateCardsTotal({ totalCardsReviewed: 11 }, 10)).toBe(true);
  });
});

describe('evaluatePerfectSession', () => {
  it('false when no session', () => {
    expect(evaluatePerfectSession({ lastSession: null })).toBe(false);
  });
  it('false when 0 cards reviewed', () => {
    expect(
      evaluatePerfectSession({
        lastSession: { cardsReviewed: 0, cardsCorrect: 0, selfGrades: { knew: 0 } }
      })
    ).toBe(false);
  });
  it('true when all correct (spelling path)', () => {
    expect(
      evaluatePerfectSession({
        lastSession: { cardsReviewed: 5, cardsCorrect: 5, selfGrades: { knew: 0 } }
      })
    ).toBe(true);
  });
  it('true when all correct (self-grade path)', () => {
    expect(
      evaluatePerfectSession({
        lastSession: { cardsReviewed: 5, cardsCorrect: 0, selfGrades: { knew: 5 } }
      })
    ).toBe(true);
  });
  it('false when some were missed', () => {
    expect(
      evaluatePerfectSession({
        lastSession: { cardsReviewed: 5, cardsCorrect: 3, selfGrades: { knew: 1 } }
      })
    ).toBe(false);
  });
});

describe('evaluateFrenchFirst', () => {
  it('triggers at 1+', () => {
    expect(evaluateFrenchFirst({ completedFrenchAudioCount: 0 })).toBe(false);
    expect(evaluateFrenchFirst({ completedFrenchAudioCount: 1 })).toBe(true);
  });
});
