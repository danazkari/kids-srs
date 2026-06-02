// Pure badge evaluators. They take the data they need and return booleans.

import { todayIso, startOfDay } from '../utils/index.js';

const DAY_MS = 86_400_000;

export function evaluateFirstCardEver({ totalCardsReviewed }) {
  return totalCardsReviewed >= 1;
}

export function evaluateFirstSession({ completedSessionCount }) {
  return completedSessionCount >= 1;
}

export function evaluateStreak({ completedDates }, target) {
  // Count consecutive days ending today (or yesterday if no session today).
  const set = new Set(completedDates);
  let streak = 0;
  const today = startOfDay(Date.now());
  // Allow streak to count if the most recent session was today or yesterday.
  let cursor = set.has(isoDay(today)) ? today : today - DAY_MS;
  if (!set.has(isoDay(cursor))) return 0;
  while (set.has(isoDay(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak >= target;
}

export function evaluateSessionsInOneDay({ sessionsByDate }, target) {
  return Object.values(sessionsByDate).some((n) => n >= target);
}

export function evaluateCardsTotal({ totalCardsReviewed }, target) {
  return totalCardsReviewed >= target;
}

export function evaluatePerfectSession({ lastSession }) {
  if (!lastSession) return false;
  if (lastSession.cardsReviewed === 0) return false;
  if (lastSession.cardsCorrect + (lastSession.selfGrades?.knew || 0) !== lastSession.cardsReviewed) return false;
  return lastSession.cardsCorrect + (lastSession.selfGrades?.knew || 0) === lastSession.cardsReviewed;
}

export function evaluateFrenchFirst({ completedFrenchAudioCount }) {
  return completedFrenchAudioCount >= 1;
}

function isoDay(ts) {
  return todayIso(new Date(ts));
}
