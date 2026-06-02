import { getDb } from './index.js';
import { uuid, todayIso } from '../utils/index.js';

export async function createSession({ deckId }) {
  const db = await getDb();
  const session = {
    id: uuid(),
    deckId,
    date: todayIso(),
    startedAt: Date.now(),
    completedAt: null,
    abandoned: false,
    currentIndex: 0,
    cardsReviewed: 0,
    cardsCorrect: 0,
    selfGrades: { knew: 0, almost: 0, notYet: 0 },
    durationSeconds: 0
  };
  await db.put('sessions', session);
  return session;
}

export async function getSession(id) {
  const db = await getDb();
  return db.get('sessions', id);
}

export async function updateSession(id, patch) {
  const db = await getDb();
  const current = await db.get('sessions', id);
  if (!current) throw new Error('Session not found');
  const next = { ...current, ...patch, id };
  await db.put('sessions', next);
  return next;
}

export async function listSessions() {
  const db = await getDb();
  return db.getAll('sessions');
}

export async function listSessionsForDeck(deckId) {
  const db = await getDb();
  return db.getAllFromIndex('sessions', 'deckId', IDBKeyRange.only(deckId));
}

/**
 * Mark any incomplete session whose date is before today as abandoned.
 * Returns the count of sessions updated.
 */
export async function reapOldIncompleteSessions() {
  const db = await getDb();
  const all = await db.getAll('sessions');
  const today = todayIso();
  let count = 0;
  const tx = db.transaction('sessions', 'readwrite');
  for (const s of all) {
    if (s.completedAt === null && s.date < today) {
      await tx.store.put({
        ...s,
        completedAt: s.startedAt,
        abandoned: true
      });
      count++;
    }
  }
  await tx.done;
  return count;
}

/**
 * Return the most-recent incomplete session for a deck (if any, for today).
 */
export async function findResumableSession(deckId) {
  const db = await getDb();
  const today = todayIso();
  const sessions = await db.getAllFromIndex('sessions', 'deckId', IDBKeyRange.only(deckId));
  return sessions
    .filter((s) => s.completedAt === null && s.date === today)
    .sort((a, b) => b.startedAt - a.startedAt)[0] || null;
}
