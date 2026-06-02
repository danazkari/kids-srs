import { describe, it, expect } from 'vitest';
import { collectBadgeContext, computeEligibleBadgeIds } from './evaluator.js';
import { todayIso } from '../utils/index.js';

const NOW = Date.now();
const TODAY = todayIso();

function session(over = {}) {
  return {
    id: 's',
    deckId: 'd',
    date: TODAY,
    startedAt: NOW,
    completedAt: NOW,
    abandoned: false,
    currentIndex: 1,
    cardsReviewed: 1,
    cardsCorrect: 1,
    selfGrades: { knew: 0, almost: 0, notYet: 0 },
    durationSeconds: 60,
    ...over
  };
}

function deck(id, language = 'en-US') {
  return {
    id,
    name: id,
    language,
    tags: [],
    status: 'active',
    cards: []
  };
}

describe('collectBadgeContext', () => {
  it('excludes abandoned sessions', () => {
    const sessions = [session({ id: 'a', abandoned: true, cardsReviewed: 5 })];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks: [] });
    expect(ctx.totalCardsReviewed).toBe(0);
    expect(ctx.completedSessionCount).toBe(0);
  });

  it('excludes incomplete sessions', () => {
    const sessions = [session({ id: 'a', completedAt: null, cardsReviewed: 5 })];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks: [] });
    expect(ctx.completedSessionCount).toBe(0);
    expect(ctx.totalCardsReviewed).toBe(0);
  });

  it('counts French audio only for fr* decks', () => {
    const decks = [deck('fr', 'fr-FR'), deck('en', 'en-US')];
    const sessions = [
      session({ id: 'a', deckId: 'fr', cardsReviewed: 4 }),
      session({ id: 'b', deckId: 'en', cardsReviewed: 4 })
    ];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks });
    expect(ctx.completedFrenchAudioCount).toBe(4);
  });

  it('matches deck language by prefix (fr-CA counts as French)', () => {
    const decks = [deck('fr-ca', 'fr-CA')];
    const sessions = [session({ id: 'a', deckId: 'fr-ca', cardsReviewed: 2 })];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks });
    expect(ctx.completedFrenchAudioCount).toBe(2);
  });

  it('produces a unique sorted-by-occurrence list of completedDates', () => {
    const sessions = [
      session({ id: 'a', date: '2024-01-01' }),
      session({ id: 'b', date: '2024-01-01' }),
      session({ id: 'c', date: '2024-01-02' })
    ];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks: [] });
    expect(ctx.completedDates).toEqual(['2024-01-01', '2024-01-02']);
  });

  it('builds sessionsByDate counts', () => {
    const sessions = [
      session({ id: 'a', date: '2024-01-01' }),
      session({ id: 'b', date: '2024-01-01' }),
      session({ id: 'c', date: '2024-01-02' })
    ];
    const ctx = collectBadgeContext({ sessions, srsList: [], decks: [] });
    expect(ctx.sessionsByDate['2024-01-01']).toBe(2);
    expect(ctx.sessionsByDate['2024-01-02']).toBe(1);
  });
});

describe('computeEligibleBadgeIds', () => {
  const baseCtx = {
    completedSessionCount: 0,
    completedDates: [],
    sessionsByDate: {},
    totalCardsReviewed: 0,
    lastSession: null,
    completedFrenchAudioCount: 0
  };

  it('returns the empty set for a fresh user', () => {
    expect(computeEligibleBadgeIds(baseCtx)).toEqual([]);
  });

  it('awards first_card on the first review', () => {
    const eligible = computeEligibleBadgeIds({ ...baseCtx, totalCardsReviewed: 1 });
    expect(eligible).toContain('first_card');
  });

  it('awards all the volume thresholds once they pass', () => {
    const eligible = computeEligibleBadgeIds({ ...baseCtx, totalCardsReviewed: 100 });
    expect(eligible).toContain('cards_10');
    expect(eligible).toContain('cards_50');
    expect(eligible).toContain('cards_100');
  });
});
