// Pure queue builder — given a deck, its cards, and SRS state, produce the
// ordered list of card objects to review this session.

import { shuffle } from '../utils/index.js';

const TYPE_KEYS = ['spelling', 'phrase', 'fact', 'audio'];

export const DEFAULT_SESSION_SIZE = { spelling: 4, phrase: 3, fact: 2, audio: 3 };

/**
 * @param {object} opts
 * @param {Array} opts.cards            - all cards in the deck
 * @param {Map|Array} opts.srsByCardId  - SRS state map keyed by cardId
 * @param {object} [opts.sessionSize]   - per-type counts to pick (deck or global)
 * @param {number} [opts.now]
 * @param {boolean} [opts.unlimited]    - if true, include ALL due/new cards with no type caps; used for timed sessions
 * @returns {Array} queue of card objects
 */
export function buildSessionQueue({ cards, srsByCardId, sessionSize, now = Date.now(), unlimited = false }) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const overrides = sessionSize || {};
  const limits = { ...DEFAULT_SESSION_SIZE, ...overrides };
  // If every cap is explicitly 0, fall back to defaults so the queue is
  // never artificially empty. This prevents the "all done for today" trap
  // when a parent sets all session sizes to 0 in Settings.
  const allZero = TYPE_KEYS.every((t) => overrides[t] === 0 || overrides[t] === undefined);
  if (allZero && Object.keys(overrides).some((k) => overrides[k] === 0)) {
    // At least one override was explicitly 0 — use defaults to unblock the session.
    Object.assign(limits, DEFAULT_SESSION_SIZE);
  }

  // Group due/new cards by type.
  const dueByType = { spelling: [], phrase: [], fact: [], audio: [] };
  const newByType = { spelling: [], phrase: [], fact: [], audio: [] };

  for (const card of cards) {
    const state = srsByCardId instanceof Map ? srsByCardId.get(card.id) : srsByCardId[card.id];
    const bucket = state ? dueByType : newByType;
    if (bucket[card.type]) bucket[card.type].push(card);
  }

  // If nothing is due anywhere, take the N cards with oldest `due` (= newest = 0).
  const anyDue = TYPE_KEYS.some((t) => dueByType[t].length > 0);
  if (!anyDue) {
    // New cards are all "due" anyway. Sort new cards across types by type priority
    // (spelling first) and then by their position in the deck.
    for (const t of TYPE_KEYS) {
      newByType[t] = shuffle(newByType[t]);
    }
  } else {
    for (const t of TYPE_KEYS) {
      // Sort by `due` ascending (oldest first) then shuffle within same timestamp.
      const indexed = dueByType[t].map((card) => ({
        card,
        due: srsByCardId instanceof Map ? srsByCardId.get(card.id).due : srsByCardId[card.id].due
      }));
      indexed.sort((a, b) => a.due - b.due);
      dueByType[t] = indexed.map((x) => x.card);
      // Mild shuffle to keep the same-due cards from being in deck order every time.
      dueByType[t] = groupedShuffle(dueByType[t]);
    }
  }

  // Timed session mode: include ALL due/new cards in SRS-influenced order, no caps.
  if (unlimited) {
    const allDue = Object.values(dueByType).flat();
    const allNew = Object.values(newByType).flat();

    // Sort due by due date ascending (most overdue first — SRS-influenced)
    allDue.sort((a, b) => {
      const aDue = srsByCardId instanceof Map ? srsByCardId.get(a.id)?.due : srsByCardId[a.id]?.due;
      const bDue = srsByCardId instanceof Map ? srsByCardId.get(b.id)?.due : srsByCardId[b.id]?.due;
      return (aDue ?? Infinity) - (bDue ?? Infinity);
    });

    // Sort new by deck array index (deterministic, no shuffle)
    allNew.sort((a, b) => cards.indexOf(a) - cards.indexOf(b));

    return [...allDue, ...allNew];
  }

  // Take up to the configured count from each type.
  const picks = [];
  for (const t of TYPE_KEYS) {
    const due = dueByType[t];
    const news = newByType[t];
    const cap = Math.max(0, limits[t] || 0);
    if (cap === 0) continue;
    if (due.length >= cap) {
      picks.push(...due.slice(0, cap));
    } else {
      picks.push(...due, ...news.slice(0, cap - due.length));
    }
  }

  // Final interleave shuffle.
  return shuffle(picks);
}

function groupedShuffle(arr) {
  if (arr.length < 2) return arr;
  return shuffle(arr);
}

/**
 * Convert an array of SRS state records to a cardId-keyed map.
 */
export function srsMapFromList(list) {
  const map = new Map();
  if (!list) return map;
  for (const s of list) map.set(s.cardId, s);
  return map;
}
