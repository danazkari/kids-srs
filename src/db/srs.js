import { getDb } from './index.js';

export async function getSrsForCard(cardId) {
  const db = await getDb();
  return db.get('srsState', cardId);
}

export async function getSrsForDeck(deckId) {
  const db = await getDb();
  return db.getAllFromIndex('srsState', 'deckId', IDBKeyRange.only(deckId));
}

export async function putSrs(state) {
  const db = await getDb();
  await db.put('srsState', state);
  return state;
}

export async function getAllSrs() {
  const db = await getDb();
  return db.getAll('srsState');
}
