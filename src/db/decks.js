import { getDb } from './index.js';
import { uuid, todayIso } from '../utils/index.js';

const CARD_TYPES = new Set(['spelling', 'phrase', 'fact', 'audio']);
const MAX_BASE64_IMAGE_BYTES = 500 * 1024;

export async function listDecks(includeArchived = true) {
  const db = await getDb();
  const all = await db.getAll('decks');
  return includeArchived ? all : all.filter((d) => d.status === 'active');
}

export async function getDeck(id) {
  const db = await getDb();
  return db.get('decks', id);
}

export async function createDeck(input) {
  const db = await getDb();
  const now = Date.now();
  const deck = {
    id: uuid(),
    name: input.name,
    language: input.language || 'en-US',
    voiceURI: input.voiceURI || '',
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    status: 'active',
    sessionSize: input.sessionSize || null,
    cards: input.cards.map(normalizeCard),
    createdAt: now,
    updatedAt: now
  };
  await db.put('decks', deck);
  return deck;
}

export async function updateDeck(id, patch) {
  const db = await getDb();
  const current = await db.get('decks', id);
  if (!current) throw new Error('Deck not found');
  const next = { ...current, ...patch, id, updatedAt: Date.now() };
  await db.put('decks', next);
  return next;
}

export async function archiveDeck(id, archived = true) {
  return updateDeck(id, { status: archived ? 'archived' : 'active' });
}

export async function deleteDeck(id) {
  const db = await getDb();
  const tx = db.transaction(['decks', 'srsState', 'sessions'], 'readwrite');
  await tx.objectStore('decks').delete(id);
  const srsIndex = tx.objectStore('srsState').index('deckId');
  let cursor = await srsIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  const sesIndex = tx.objectStore('sessions').index('deckId');
  cursor = await sesIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function replaceCards(deckId, newCards) {
  const db = await getDb();
  const deck = await db.get('decks', deckId);
  if (!deck) throw new Error('Deck not found');
  const oldIds = new Set(deck.cards.map((c) => c.id));
  const newIds = new Set(newCards.map((c) => c.id));
  const removedIds = [...oldIds].filter((id) => !newIds.has(id));
  const addedIds = [...newIds].filter((id) => !oldIds.has(id));
  const unchangedIds = [...oldIds].filter((id) => newIds.has(id));

  // Reset SRS for added cards (they're new). For removed cards, delete state.
  const tx = db.transaction(['decks', 'srsState'], 'readwrite');
  const updatedDeck = {
    ...deck,
    cards: newCards.map(normalizeCard),
    updatedAt: Date.now()
  };
  await tx.objectStore('decks').put(updatedDeck);
  for (const id of removedIds) {
    await tx.objectStore('srsState').delete(id);
  }
  for (const id of addedIds) {
    await tx.objectStore('srsState').delete(id);
  }
  await tx.done;
  return { addedIds, removedIds, unchangedIds };
}

/**
 * Validate and normalize a parsed JSON deck. Returns { deck, warnings }.
 * Throws an Error with a friendly message if validation fails.
 */
export function validateDeckJson(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Not a JSON object.');
  if (typeof raw.name !== 'string' || !raw.name.trim()) throw new Error('Missing deck name.');
  const cards = raw.cards;
  if (!Array.isArray(cards) || cards.length === 0) throw new Error('Deck must include at least one card.');

  const warnings = [];
  const seen = new Set();
  const normalized = cards.map((c, i) => {
    if (!c || typeof c !== 'object') throw new Error(`Card #${i + 1}: not an object.`);
    if (typeof c.id !== 'string' || !c.id.trim()) throw new Error(`Card #${i + 1}: missing id.`);
    if (seen.has(c.id)) throw new Error(`Card #${i + 1}: duplicate id "${c.id}".`);
    seen.add(c.id);
    if (!CARD_TYPES.has(c.type)) throw new Error(`Card #${i + 1}: type must be one of spelling|phrase|fact|audio.`);
    if (typeof c.answer !== 'string' || !c.answer.length) throw new Error(`Card #${i + 1}: missing answer.`);
    let image = c.image ?? null;
    if (image && typeof image !== 'string') throw new Error(`Card #${i + 1}: image must be a string or null.`);
    if (image && image.startsWith('data:image/')) {
      // Approximate byte length.
      const comma = image.indexOf(',');
      const b64 = comma >= 0 ? image.slice(comma + 1) : image;
      const bytes = Math.floor(b64.length * 0.75);
      if (bytes > MAX_BASE64_IMAGE_BYTES) {
        warnings.push(`Card #${i + 1}: image is ${Math.round(bytes / 1024)} KB — consider using a URL.`);
      }
    }
    return {
      id: c.id,
      type: c.type,
      emoji: typeof c.emoji === 'string' ? c.emoji : '',
      image,
      prompt: typeof c.prompt === 'string' ? c.prompt : '',
      answer: c.answer
    };
  });

  return {
    deck: {
      name: raw.name.trim(),
      language: typeof raw.language === 'string' ? raw.language : 'en-US',
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()) : [],
      cards: normalized
    },
    warnings
  };
}

function normalizeCard(c) {
  return {
    id: c.id,
    type: c.type,
    emoji: c.emoji || '',
    image: c.image ?? null,
    prompt: c.prompt || '',
    answer: c.answer
  };
}

export function exportDeckAsJson(deck) {
  return {
    name: deck.name,
    language: deck.language,
    tags: deck.tags,
    cards: deck.cards.map((c) => ({
      id: c.id,
      type: c.type,
      emoji: c.emoji,
      image: c.image,
      prompt: c.prompt,
      answer: c.answer
    }))
  };
}

/**
 * Returns the count of cards that are due (or new) for a deck.
 * Used by the kid home screen.
 */
export async function countDue(deckId) {
  const db = await getDb();
  const deck = await db.get('decks', deckId);
  if (!deck) return { due: 0, newCount: 0 };
  const srsIndex = db.transaction('srsState').store.index('deckId');
  const all = await srsIndex.getAll(IDBKeyRange.only(deckId));
  const now = Date.now();
  let due = 0;
  let newCount = 0;
  const seenCardIds = new Set();
  for (const s of all) {
    seenCardIds.add(s.cardId);
    if (s.due <= now) due++;
  }
  for (const c of deck.cards) {
    if (!seenCardIds.has(c.id)) newCount++;
  }
  return { due: due + newCount, dueOnly: due, newCount };
}
