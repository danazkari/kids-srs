// Aggregates data and decides which badges to award. Pure given the inputs.

import {
  evaluateFirstCardEver,
  evaluateFirstSession,
  evaluateStreak,
  evaluateSessionsInOneDay,
  evaluateCardsTotal,
  evaluatePerfectSession,
  evaluateFrenchFirst
} from './checks.js';
import { todayIso } from '../utils/index.js';

export function collectBadgeContext({ sessions, srsList, decks, lastSession = null }) {
  const completed = sessions.filter((s) => s.completedAt && !s.abandoned);
  const completedDates = [...new Set(completed.map((s) => s.date))];
  const sessionsByDate = completed.reduce((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + 1;
    return acc;
  }, {});

  const totalCardsReviewed = completed.reduce((sum, s) => sum + (s.cardsReviewed || 0), 0);

  // Count completed French audio cards.
  const deckById = new Map(decks.map((d) => [d.id, d]));
  let completedFrenchAudioCount = 0;
  for (const s of completed) {
    const deck = deckById.get(s.deckId);
    if (!deck) continue;
    if ((deck.language || '').toLowerCase().startsWith('fr')) {
      completedFrenchAudioCount += s.cardsReviewed || 0;
    }
  }

  return {
    completedSessionCount: completed.length,
    completedDates,
    sessionsByDate,
    totalCardsReviewed,
    lastSession,
    completedFrenchAudioCount
  };
}

export function computeEligibleBadgeIds(ctx) {
  const eligible = [];
  if (evaluateFirstCardEver(ctx)) eligible.push('first_card');
  if (evaluateFirstSession(ctx)) eligible.push('first_session');
  if (evaluateStreak(ctx, 3)) eligible.push('streak_3');
  if (evaluateStreak(ctx, 7)) eligible.push('streak_7');
  if (evaluateStreak(ctx, 30)) eligible.push('streak_30');
  if (evaluateSessionsInOneDay(ctx, 2)) eligible.push('double_session');
  if (evaluateSessionsInOneDay(ctx, 3)) eligible.push('triple_session');
  if (evaluateCardsTotal(ctx, 10)) eligible.push('cards_10');
  if (evaluateCardsTotal(ctx, 50)) eligible.push('cards_50');
  if (evaluateCardsTotal(ctx, 100)) eligible.push('cards_100');
  if (evaluatePerfectSession(ctx)) eligible.push('perfect_session');
  if (evaluateFrenchFirst(ctx)) eligible.push('french_first');
  return eligible;
}
