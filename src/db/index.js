import { openDB } from 'idb';

const DB_NAME = 'srs-kids';
const DB_VERSION = 1;

let _dbPromise = null;
let _dbUnavailable = false;

export function isDbUnavailable() {
  return _dbUnavailable;
}

export function getDb() {
  if (_dbUnavailable) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!_dbPromise) {
    if (typeof indexedDB === 'undefined') {
      _dbUnavailable = true;
      return Promise.reject(new Error('IndexedDB unavailable'));
    }
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('decks')) {
          const decks = db.createObjectStore('decks', { keyPath: 'id' });
          decks.createIndex('status', 'status');
          decks.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('srsState')) {
          const s = db.createObjectStore('srsState', { keyPath: 'cardId' });
          s.createIndex('deckId', 'deckId');
          s.createIndex('due', 'due');
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('deckId', 'deckId');
          s.createIndex('date', 'date');
          s.createIndex('startedAt', 'startedAt');
        }
        if (!db.objectStoreNames.contains('badges')) {
          db.createObjectStore('badges', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
      blocked() {
        // Another tab has the DB open with an older version.
        console.warn('IndexedDB upgrade blocked by another tab.');
      },
      blocking() {
        // This tab is blocking an upgrade in another.
        if (_dbPromise) _dbPromise.then((db) => db.close()).catch(() => {});
        _dbPromise = null;
      },
      terminated() {
        _dbPromise = null;
      }
    }).catch((err) => {
      _dbUnavailable = true;
      throw err;
    });
  }
  return _dbPromise;
}

export async function metaGet(key, fallback = null) {
  try {
    const db = await getDb();
    const row = await db.get('meta', key);
    return row ? row.value : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function metaSet(key, value) {
  try {
    const db = await getDb();
    await db.put('meta', { key, value });
  } catch (e) {
    // ignore
  }
}
