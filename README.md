# SRS Kids

A spaced-repetition study web app for young children (ages 5–8). Fully offline PWA. All data lives in IndexedDB — no backend, no login.

See `SPEC.md` (the spec this was built from) for full feature details.

## Threat model

The parent dashboard is guarded by a multiplication gate (a × b where a, b ∈ 2..9, with a 60-second cooldown after three wrong answers). **This is a child-resistance nudge, not a security control.** A motivated user can clear `sessionStorage.parent-authed` in DevTools and walk right in. The gate exists so a child playing with the device doesn't accidentally land in the parent's view. Don't try to "harden" it into something that resists a real adversary — that's not what it's for, and it would be the wrong hill to die on anyway because all the data is already on the device.

## Stack

- **Vite** + **Preact** (ES modules, JSX)
- **idb** for IndexedDB
- **Chart.js** for the parent dashboard metrics
- **Workbox** (via `vite-plugin-pwa`) for the service worker
- **Comic Relief** font from Google Fonts (cached for offline use)
- **Web Speech API** for audio card pronunciation
- No CSS framework — design tokens in CSS custom properties

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and:

1. The **kid view** loads first. There are no decks yet, so the empty state shows.
2. Tap the 🔒 icon (top left) to open the **parent dashboard** and pass the multiplication gate.
3. Go to **Decks** and upload one of the sample decks in `sample-decks/` (e.g. `animals-senses.en-US.json`).
4. Head back to the kid view and start a session.
5. Earn badges, study daily, and check the **Overview** tab for charts.

## Build & deploy

```bash
npm run build
npm run preview
```

The `dist/` output is a static site. Serve it from any static host (or just run the preview).

## Project structure

```
public/                  static assets, manifest, icons
scripts/gen-icons.mjs    optional icon regeneration
src/
  main.jsx               app entry, router, boot
  i18n.js                centralised user-facing strings
  router.js              hash router
  db/                    IndexedDB layer (idb wrapper)
  srs/                   pure SM-2 algorithm + queue builder
  badges/                badge catalog + evaluator
  speech/                Web Speech API wrapper
  utils/                 shared helpers
  components/            Modal, ProgressBar, Confetti, ToastHost
  styles/                tokens.css, base.css, kid.css, parent.css
  views/
    kid/                 Home, Session, OnScreenKeyboard, cards/*
    parent/              Gate, Dashboard, Decks, Settings + chart wrappers
sample-decks/            ready-to-import JSON decks for testing
```

## JSON deck format

```json
{
  "name": "Deck name",
  "language": "en-US",
  "tags": ["tag1", "tag2"],
  "cards": [
    {
      "id": "sp01",
      "type": "spelling",
      "emoji": "🐱",
      "image": null,
      "prompt": "Hint",
      "answer": "word"
    },
    {
      "id": "au01",
      "type": "audio",
      "emoji": "🍎",
      "image": null,
      "prompt": "apple",
      "answer": "une pomme"
    },
    { "id": "ph01", "type": "phrase", "emoji": "💡", "image": null, "prompt": "Q?", "answer": "A" },
    { "id": "fa01", "type": "fact", "emoji": "🦴", "image": null, "prompt": "Q?", "answer": "A" }
  ]
}
```

- `id` must be unique within a deck and **stable** across re-uploads (it's used as the SRS key).
- `image` can be `null`, a URL, or `data:image/...;base64,...` (warns above ~500 KB).
- `language` is a BCP-47 tag, used for Web Speech synthesis.

## SRS algorithm

Simplified SM-2. Spelling cards are auto-graded (correct → grade 2, wrong → grade 0). Phrase / fact / audio cards are self-graded (knew → 2, almost → 1, not yet → 0). See `src/srs/algorithm.js`.

## Edge cases handled

- IndexedDB unavailable → friendly boot error.
- Speech synthesis not yet ready → waits for `voiceschanged`, with a hard timeout.
- Image load failure → falls back to the card emoji as a placeholder.
- iOS Web Speech needs a user gesture → audio is triggered on the flip tap, which counts.
- Large base64 images → warned on upload (500 KB threshold).
- Resuming a session → offered when an incomplete same-day session exists.
- Old incomplete sessions (previous days) → auto-abandoned on app load.

## License

MIT (or whatever you prefer — no license file is shipped).
