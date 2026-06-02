import { getDb } from './index.js';

export async function listBadges() {
  const db = await getDb();
  return db.getAll('badges');
}

export async function hasBadge(id) {
  const db = await getDb();
  const row = await db.get('badges', id);
  return !!row;
}

export async function awardBadge(id) {
  const db = await getDb();
  const existing = await db.get('badges', id);
  if (existing) return false;
  await db.put('badges', { id, earnedAt: Date.now() });
  return true;
}

export async function awardBadges(ids) {
  const db = await getDb();
  const tx = db.transaction('badges', 'readwrite');
  // The idb library exposes the object store as a wrapped store
  // whose methods return promises (no raw IDBRequest, no
  // onsuccess/onerror boilerplate). Using the wrapped methods
  // keeps the transaction alive across microtask boundaries and
  // avoids the request-await footgun.
  const store = tx.objectStore('badges');
  const newlyAwarded = [];
  for (const id of ids) {
    const existing = await store.get(id);
    if (!existing) {
      await store.put({ id, earnedAt: Date.now() });
      newlyAwarded.push(id);
    }
  }
  await tx.done;
  return newlyAwarded;
}
