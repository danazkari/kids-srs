// Pure SM-2 (simplified) SRS algorithm. No side effects, no DB access.

const DAY_MS = 86_400_000;
export const MIN_EASE = 1.3;

export const GRADE = {
  FAIL: 0,    // "not yet"
  ALMOST: 1,  // "almost"
  PASS: 2     // "I knew it"
};

/**
 * Build a fresh SRS state for a never-before-seen card.
 */
export function newSrsState(cardId, deckId, now = Date.now()) {
  return {
    cardId,
    deckId,
    interval: 0,
    easeFactor: 2.5,
    due: now, // due immediately
    reps: 0,
    lapses: 0,
    lastReviewed: 0
  };
}

/**
 * Apply a grade (0/1/2) to an existing SRS state and return the new state.
 * Pure function — does not mutate input.
 */
export function applyGrade(state, grade, now = Date.now()) {
  let { interval, easeFactor, reps, lapses } = state;

  if (grade === GRADE.FAIL) {
    reps = 0;
    interval = 1;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    lapses = (lapses || 0) + 1;
  } else if (grade === GRADE.ALMOST) {
    reps = (reps || 0) + 1;
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.05);
  } else {
    // PASS
    reps = (reps || 0) + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.max(1, Math.round(interval * easeFactor));
  }

  return {
    ...state,
    interval,
    easeFactor,
    reps,
    lapses,
    due: now + interval * DAY_MS,
    lastReviewed: now
  };
}

/**
 * Compare user's typed answer to the correct answer.
 * Case-insensitive, trimmed, ignores diacritics on accented characters (children
 * may not have a French keyboard).
 */
export function checkSpelling(userAnswer, correctAnswer) {
  const norm = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  return norm(userAnswer) === norm(correctAnswer);
}

/**
 * Returns the per-character correctness map for a spelling answer.
 * Array of { char, status: 'correct' | 'wrong' | 'missing' }.
 */
export function letterCompare(userAnswer, correctAnswer) {
  const userChars = [...userAnswer];
  const correctChars = [...correctAnswer];
  const result = [];
  for (let i = 0; i < correctChars.length; i++) {
    if (i < userChars.length) {
      const u = userChars[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const c = correctChars[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      result.push({ char: correctChars[i], status: u === c ? 'correct' : 'wrong' });
    } else {
      result.push({ char: correctChars[i], status: 'missing' });
    }
  }
  return result;
}
