import { describe, it, expect } from 'vitest';
import { buildSessionQueue, srsMapFromList, DEFAULT_SESSION_SIZE } from './queue.js';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function card(id, type) {
  return { id, type, emoji: '', image: null, prompt: id, answer: id };
}

const sizeAll = { spelling: 99, phrase: 99, fact: 99, audio: 99 };

describe('buildSessionQueue', () => {
  it('returns empty for empty cards', () => {
    expect(buildSessionQueue({ cards: [], srsByCardId: {} })).toEqual([]);
  });

  it('returns empty when cards is missing', () => {
    expect(buildSessionQueue({})).toEqual([]);
  });

  it('takes new cards when nothing is due', () => {
    const cards = [card('a', 'spelling'), card('b', 'spelling'), card('c', 'phrase')];
    const q = buildSessionQueue({ cards, srsByCardId: {}, sessionSize: { spelling: 2, phrase: 1, fact: 0, audio: 0 } });
    expect(q).toHaveLength(3);
    expect(new Set(q.map((c) => c.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('respects per-type session caps', () => {
    const cards = [
      card('a', 'spelling'), card('b', 'spelling'), card('c', 'spelling'),
      card('d', 'spelling'), card('e', 'spelling')
    ];
    const q = buildSessionQueue({ cards, srsByCardId: {}, sessionSize: { spelling: 2, phrase: 0, fact: 0, audio: 0 } });
    expect(q).toHaveLength(2);
  });

  it('prefers due cards over new cards when caps exceed due count', () => {
    // 2 due cards + 2 new cards, cap 3. The queue should take both due
    // cards plus one new card — not the other way around.
    const cards = [card('a', 'spelling'), card('b', 'spelling'), card('c', 'spelling'), card('d', 'spelling')];
    const srsByCardId = {
      a: { cardId: 'a', due: NOW - DAY, reps: 1, interval: 1 },
      b: { cardId: 'b', due: NOW - 2 * DAY, reps: 1, interval: 2 }
      // c and d are new
    };
    const q = buildSessionQueue({ cards, srsByCardId, sessionSize: { spelling: 3, phrase: 0, fact: 0, audio: 0 } });
    expect(q).toHaveLength(3);
    const ids = new Set(q.map((c) => c.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    // Exactly one of the new cards.
    expect(ids.has('c') || ids.has('d')).toBe(true);
    expect(!(ids.has('c') && ids.has('d'))).toBe(true);
  });

  it('all due cards are included when cap is high enough', () => {
    const cards = [card('a', 'spelling'), card('b', 'spelling'), card('c', 'spelling')];
    const srsByCardId = {
      a: { cardId: 'a', due: NOW - 3 * DAY, reps: 1, interval: 3 },
      b: { cardId: 'b', due: NOW - DAY, reps: 1, interval: 1 },
      c: { cardId: 'c', due: NOW - 2 * DAY, reps: 1, interval: 2 }
    };
    const q = buildSessionQueue({ cards, srsByCardId, sessionSize: { spelling: 3, phrase: 0, fact: 0, audio: 0 } });
    expect(q).toHaveLength(3);
    expect(new Set(q.map((c) => c.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('handles Map input for srsByCardId', () => {
    const cards = [card('a', 'spelling')];
    const map = new Map([['a', { cardId: 'a', due: NOW, reps: 0, interval: 0 }]]);
    const q = buildSessionQueue({ cards, srsByCardId: map, sessionSize: DEFAULT_SESSION_SIZE });
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe('a');
  });

  it('produces only card ids from the input deck', () => {
    const cards = [card('a', 'spelling'), card('b', 'phrase')];
    const q = buildSessionQueue({ cards, srsByCardId: {}, sessionSize: sizeAll });
    const ids = new Set(cards.map((c) => c.id));
    for (const c of q) expect(ids.has(c.id)).toBe(true);
  });

  it('returns at most the sum of caps', () => {
    const cards = [
      card('a', 'spelling'), card('b', 'spelling'),
      card('c', 'phrase'), card('d', 'phrase'),
      card('e', 'fact'),
      card('f', 'audio'), card('g', 'audio')
    ];
    const q = buildSessionQueue({ cards, srsByCardId: {}, sessionSize: { spelling: 1, phrase: 1, fact: 1, audio: 1 } });
    expect(q).toHaveLength(4);
  });
});

describe('srsMapFromList', () => {
  it('builds a Map keyed by cardId', () => {
    const list = [
      { cardId: 'a', due: 1 },
      { cardId: 'b', due: 2 }
    ];
    const m = srsMapFromList(list);
    expect(m).toBeInstanceOf(Map);
    expect(m.size).toBe(2);
    expect(m.get('a').due).toBe(1);
  });

  it('handles null/undefined input', () => {
    expect(srsMapFromList(null).size).toBe(0);
    expect(srsMapFromList(undefined).size).toBe(0);
  });
});
