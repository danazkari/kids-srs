# AGENTS.md — SRS Kids

## Project Overview

SRS Kids is an offline-first spaced-repetition study PWA for children ages 5–8. All data lives in the browser's IndexedDB. No backend, no login, no cloud sync.

**Stack:** Vite + Preact · idb · Chart.js · Workbox (vite-plugin-pwa) · Web Speech API

## Directory Structure

```
src/
  main.jsx              — app entry point, hash router
  db/index.js           — IndexedDB schema (6 stores)
  srs/
    algorithm.js        — SM-2 grade application (pure fns)
    queue.js            — session queue builder (pure fns)
  badges/
    checks.js           — per-badge eligibility functions
    evaluator.js        — badge context aggregation
  speech/               — Web Speech API wrapper
  views/
    kid/                — Home, Session, cards (Phrase, Spelling, Audio, Fact), BadgeModal
    parent/             — Gate, Dashboard, Decks, Settings
e2e/
  features/             — Gherkin .feature files (numbered prefix controls run order)
  step-definitions/     — common.steps.js, data.steps.js, kid.steps.js, parent.steps.js
  support/
    world.js            — SRSWorld class (all navigation + DB helpers)
    hooks.js            — BeforeAll/Before/After cucumber hooks
    browser.js          — Playwright browser lifecycle
    server.js           — vite preview server manager
    paths.js            — fixturePath() helper
    fixtures/           — 14 JSON deck files for import testing
cucumber.cjs            — Cucumber config (default + smoke profiles)
vite.config.js
```

## Gherkin/Cucumber Conventions

### Feature File Naming & Run Order

Feature files use a `NN-` prefix to control execution order. This is intentional — some scenarios depend on prior state (e.g. `@smoke` must run first as the base scaffold).

| Prefix | File | Purpose |
|---|---|---|
| `00-` | `scaffold.feature` | App loads in a real browser (the base smoke test) |
| `01-` | `pwa-foundation.feature` | PWA manifest, service worker, hash routing, theme |
| `02-` | `data-integrity.feature` | Deck import validation (7 malformed files + valid) |
| `03-` | `storage.feature` | Profile auto-creation, persistence, theme persistence |
| `05-` | `kid-session.feature` | Core learning loop: session start, grading, done screen |
| `06-` | `regressions.feature` | Mid-session regressions: streak hidden, no mid-session badge modal |
| `07-` | `parent-overview.feature` | Dashboard summary cards, mastery bucket exclusivity |
| `08-` | `parent-decks.feature` | Archive, unarchive, delete deck + SRS state cleanup |
| `09-` | `parent-settings.feature` | Profile name persistence, accent color persistence |
| `10-` | `badges.feature` | Badge award at session end, first card badge, perfect round |
| `11-` | `offline.feature` | Service worker caches app shell for offline reload |

> Prefix `04-` is reserved/skipped.

### Tag Conventions

Tags use two axes:

**Priority:**
- `@p0` — must pass; core path regressions
- `@p1` — important but not blocker for shipping

**Category (can stack):**
- `@smoke` — minimum viable test subset (currently `00-scaffold` only)
- `@foundation` — PWA infrastructure (manifest, SW, routing)
- `@data-integrity` — import validation
- `@storage` — IndexedDB persistence
- `@kid-session` — kid learning flow
- `@regressions` — regression guards for known fixes
- `@parent-overview` — parent dashboard
- `@parent-decks` — deck management
- `@parent-settings` — settings persistence
- `@badges` — badge award logic
- `@offline` — PWA offline capability

Cucumber profiles:
- **default** — full suite; report at `e2e/reports/cucumber-report.html`
- **smoke** — `@smoke` tagged scenarios only; progress format to stdout

### Step Definition Organization

Steps are grouped by domain, not by feature file. All steps from `common.steps.js` are available globally to every feature.

| File | Domain | Key Steps |
|---|---|---|
| `common.steps.js` | Navigation, generic interactions | `Given I am on the kid home page`, `When I click {string}`, `Then I see {string}` |
| `data.steps.js` | PWA foundation, DB setup, deck import, theme | `Given I have cleared the database`, `When I import the deck file {string}`, `Then I see an error containing {string}` |
| `kid.steps.js` | Session, cards, grading, done, badges | `When I start a session for the {string} deck`, `When I grade the phrase card as {string}`, `Then I see the done screen` |
| `parent.steps.js` | Deck management, overview, settings, offline | `When I archive the {string} deck`, `Then the summary card {string} shows {string}`, `When I go offline` |

**Per-step timeout:** 30 seconds in `kid.steps.js` (default 5s is too tight for grading steps that must await an async IDB write + Preact re-render).

## SRSWorld Helper Methods

The `SRSWorld` class (in `e2e/support/world.js`) is the shared context for all step definitions. Available via `this` in every step.

### Navigation
```javascript
await this.gotoKidHome()                   // Navigate to kid home (#/)
await this.gotoSession(deckId)             // Navigate to session (#/session?deck=<id>)
await this.gotoParent(tab)                 // Navigate to parent tab (#/parent/<tab>), tab ∈ {overview, decks, settings}
await this._navigate(hashPath)             // Internal: set window.location.hash for in-app navigation
```

### Auth
```javascript
await this.solveGateIfPresent()            // Solve the multiplication gate if visible; no-op otherwise
```

### Deck Operations
```javascript
await this.importDeck(fixtureName)         // Full import flow: navigate to parent/decks, open modal, set file, upload
await this.getDeckIdByName(name)           // Look up a deck's UUID by its human-readable name; returns null if not found
```

### Storage
```javascript
await this.clearAllStorage()               // Clear localStorage, sessionStorage, and all IndexedDB databases
```

### Properties
```javascript
this.page                                     // Playwright Page for current context
this.context                                  // Playwright BrowserContext for current scenario
this.serverUrl                                // Vite preview server URL (e.g. http://localhost:4173)
```

### Screenshot on Failure
`this.screenshotOnFailure = true` is set by default. On a failed scenario, `After` hook captures a full-page screenshot to `e2e/screenshots/<scenario-name>.png`.

## IndexedDB Schema

Database name: `srs-kids` · Version: 1

| Store | KeyPath | Indexes | Purpose |
|---|---|---|---|
| `profiles` | `id` | — | User profiles (default profile auto-created on first boot) |
| `decks` | `id` | `status`, `updatedAt` | Deck metadata; `status` ∈ {active, archived} |
| `srsState` | `cardId` | `deckId`, `due` | Per-card SM-2 state (interval, easeFactor, due date, reps, lapses) |
| `sessions` | `id` | `deckId`, `date`, `startedAt` | Completed session records |
| `badges` | `id` | — | Awarded badge instances |
| `meta` | `key` | — | Key-value store for app metadata (current profile, etc.) |

## Adding New E2E Tests

### 1. Create or extend a `.feature` file

Put the file in `e2e/features/` with a `NN-` prefix that reflects where it runs in the sequence:
- New foundational tests → between `01-` and `02-`
- New kid-session tests → between `05-` and `06-`
- etc.

Use existing tags (`@p0`, `@p1`) and add a category tag if applicable. Do not invent new tags without updating this file.

### 2. Add steps to the appropriate step-def file

Use this decision tree:

```
Does the step involve the kid learning loop (session, cards, grading)?  → kid.steps.js
Does the step involve the parent dashboard, deck management, or settings? → parent.steps.js
Does the step involve PWA infrastructure, IndexedDB, or deck import validation? → data.steps.js
Is it a generic interaction or navigation usable across all views?       → common.steps.js
```

### 3. Use existing World helpers

Prefer composing `this.gotoKidHome()`, `this.importDeck()`, `this.getDeckIdByName()`, `this.clearAllStorage()` over direct `page.evaluate()` calls. Add new helper methods to `world.js` only when the pattern is reused in 2+ step definitions.

### 4. Add fixtures if needed

Place JSON deck fixtures in `e2e/support/fixtures/`. Use `fixturePath(name)` from `e2e/support/paths.js` to reference them in steps.

### 5. Run locally

```bash
# Unit tests (fast)
npm test

# Full E2E suite (requires Docker)
npm run test:e2e

# Smoke profile only
npm run test:e2e:smoke
```

## Bug Reporting & BDD Workflow

**All bugs must be reproduced as Gherkin scenarios before they are considered "fixed."**

When a bug is found:

1. **Write the failing scenario first.** Create a `.feature` file (or add to an existing one) with a `Scenario` that reproduces the bug. Use exact, observable steps — not implementation language.
2. **Run the suite.** Confirm the scenario fails. This serves as the regression guard.
3. **Fix the code.** Make the scenario pass.
4. **Consider the bug solved** only when the scenario is green in the full suite.

This means:
- Never commit a fix without a corresponding failing → passing Gherkin scenario
- Edge cases and one-off fixes go through the same workflow: `.feature` first, then code
- Bug scenarios live in `e2e/features/` alongside functional tests, tagged appropriately (`@regressions` for confirmed bug fixes, or a new category tag if no existing tag fits)

Example bug workflow:

```
# 1. File: e2e/features/06-regressions.feature (or a new file)
@regressions @p0
Scenario: Grade button does not advance to next card when tapped rapidly
  Given I am on the session page for the "Spelling" deck
  When I type "test" and submit the spelling card
  Then I do not see the spelling card

# 2. Run — confirm it fails
npm run test:e2e

# 3. Fix the code in src/views/kid/Session.jsx

# 4. Run again — confirm it passes
npm run test:e2e
```

## Running Tests

### Unit Tests (Vitest)
```bash
npm test              # single run
npm run test:watch    # watch mode
```
Tests live alongside source files: `src/**/*.test.{js,jsx}`.
Environment: `happy-dom`

### E2E Tests (Cucumber + Playwright)
```bash
npm run test:e2e           # full suite in Docker; report → e2e/reports/cucumber-report.html
npm run test:e2e:smoke     # smoke profile only (@smoke scenarios)
```

E2E runs inside a Docker container (`mcr.microsoft.com/playwright:v1.60.0-jammy`) with a pre-built `dist/`. Reports and screenshots are mounted as volumes:
- `e2e/reports/` — HTML cucumber report
- `e2e/screenshots/` — full-page screenshots on failure

**Local dev server (no Docker):**
```bash
npm run dev        # vite dev server on port 5173
npm run preview    # vite preview server on port 4173 (same port the E2E harness uses)
```

## Code Style

**ESLint** (`eslint.config.js`):
- JSX allowed in `src/` only
- Ignores: `dist/`, `node_modules/`, `public/`, `e2e/`, `coverage/`

**Prettier** (`.prettierrc`):
- Single quotes, semicolons, 2-space indent, 100 print width

```bash
npm run lint         # check
npm run lint:fix     # auto-fix
npm run format       # format all files
npm run format:check # check formatting
```

CSS: No framework. Theming via CSS custom properties (`--accent`, `--theme`, etc.) defined on `:root`.

## CI Workflow

Two jobs in `.github/workflows/ci.yml`:

1. **`build`** — runs in parallel: lint → unit tests → build
2. **`e2e`** — depends on `build` passing: docker build → docker run (full suite) → upload artifacts (reports + screenshots)

Artifacts are uploaded for both jobs on failure for inspection.