# SPEC

What SRS Kids is and what it is not, in one page. The README explains _how_ to run it; this file explains _what_ you're building.

## Scope

- **Audience**: young children, ages 5–8.
- **Form factor**: a single-page web app, installable as a PWA.
- **Offline**: yes, fully. Service worker caches the app shell, the Google Fonts CSS + woff2, and remote card images. All state lives in the browser.
- **Backend / accounts / sync**: none. Each device is its own island.
- **Data store**: IndexedDB via [`idb`](https://github.com/jakearchibald/idb). One database, six stores: `profiles`, `decks`, `srsState`, `sessions`, `badges`, `meta`.

## Card types

A deck is an array of cards. Each card has a `type`:

| Type       | Grading                                                           | Notes                                                                                  |
| ---------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `spelling` | Auto-graded. Correct → grade 2, wrong → grade 0.                  | Uses the on-screen A–Z keyboard. Case- and diacritic-insensitive.                      |
| `phrase`   | Self-graded. Three buttons: not yet (0), almost (1), knew it (2). | Standard flip card.                                                                    |
| `fact`     | Same as `phrase`.                                                 | Kept as a separate type so the queue builder can order them differently in the future. |
| `audio`    | Self-graded, same three buttons.                                  | TTS via Web Speech API on flip.                                                        |

## SRS algorithm

A simplified SM-2, no learning-step. See `src/srs/algorithm.js`.

- `grade 0` (FAIL): reset `reps` to 0, `interval` to 1 day, drop `easeFactor` by 0.2 (floor 1.3), increment `lapses`.
- `grade 1` (ALMOST): grow `interval` by ×1.2, drop `easeFactor` by 0.05.
- `grade 2` (PASS): first two reps fixed at 1d / 3d, then `interval *= easeFactor`.

## Session shape

- A **session** is a per-deck run capped by per-type counts.
- Session size defaults: 4 spelling / 3 phrase / 2 fact / 3 audio. Configurable globally and per-deck.
- The queue builder blends due cards (oldest first) with new cards, capped per type, then interleaves and shuffles.
- Same-day resumable sessions are offered on re-entry. Previous-day incomplete sessions are auto-abandoned on app boot.

## Parent dashboard

A multiplication gate (2×2..9×9) leads to three tabs:

- **Overview**: 4 summary cards, 7d / 30d / all-time range pills, daily cards line, duration bar, accuracy line, mastery doughnut, 12-week heatmap, hardest-cards table, badges timeline.
- **Decks**: upload JSON (drag/drop or click), edit, archive, replace cards (id-differenced), download, delete. Validation errors are surfaced inline.
- **Settings**: kid's name, keyboard layout (QWERTY/ABC), accent color (5), theme (light/dark/system), audio toggles, per-deck voice picker.

## Badges

12 fixed badges, evaluated on session completion by `src/badges/evaluator.js`. Streaks (3/7/30), volume (10/50/100 cards), session-count (2/3 in a day), first-card, first-session, perfect-round, first French audio.

## Theming

- 5 accent palettes × 3 themes (light/dark/system).
- Design tokens in `src/styles/tokens.css` use `[data-theme]` and `[data-accent]` attribute selectors.
- `src/theme.js` is the runtime applier; `index.html` has a tiny synchronous pre-paint script that reads the last choice from `localStorage` to avoid a theme flash.

## Out of scope (for now)

- User accounts, cloud sync, multi-device.
- Multiple kid profiles per device.
- Audio recording / playback of the child's own voice.
- Custom deck authoring inside the app (decks are JSON files in / out).
- Internationalisation of the UI strings (English only; `src/i18n.js` is structured to make adding languages easy).
