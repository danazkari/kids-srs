// Fixed badge catalog. Conditions are evaluated by `evaluator.js` against the
// current data in IndexedDB.

export const BADGES = [
  { id: 'first_card',     emoji: '🌱', name: 'First Step!',     hint: 'Review your first card' },
  { id: 'first_session',  emoji: '🎉', name: 'Session Star!',   hint: 'Finish your first session' },
  { id: 'streak_3',       emoji: '🔥', name: 'On Fire!',         hint: '3 days in a row' },
  { id: 'streak_7',       emoji: '🌟', name: 'Super Streak!',    hint: '7 days in a row' },
  { id: 'streak_30',      emoji: '👑', name: 'Champion!',         hint: '30 days in a row' },
  { id: 'double_session', emoji: '⚡', name: 'Double Power!',     hint: '2 sessions in one day' },
  { id: 'triple_session', emoji: '🚀', name: 'Triple Blast!',     hint: '3 sessions in one day' },
  { id: 'cards_10',       emoji: '📚', name: 'Bookworm!',         hint: '10 cards reviewed' },
  { id: 'cards_50',       emoji: '🧠', name: 'Brain Builder!',    hint: '50 cards reviewed' },
  { id: 'cards_100',      emoji: '💎', name: 'Diamond Mind!',     hint: '100 cards reviewed' },
  { id: 'perfect_session',emoji: '✨', name: 'Perfect Round!',    hint: 'A session with no misses' },
  { id: 'french_first',   emoji: '🥐', name: 'Bonjour!',          hint: 'First French audio card' }
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
