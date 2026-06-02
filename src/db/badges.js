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
  const newlyAwarded = [];
  for (const id of ids) {
    const existing = await tx.store.get(id);
    if (!existing) {
      await tx.store.put({ id, earnedAt: Date.now() });
      newlyAwarded.push(id);
    }
  }
  await tx.done;
  return newlyAwarded;
}
