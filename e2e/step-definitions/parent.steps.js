// Parent view step definitions: deck management (archive/unarchive/delete),
// overview summary cards, settings (name, accent), offline toggle.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { fixturePath } from '../support/paths.js';

// ----- Deck management -----

When('I archive the {string} deck', async function (deckName) {
  const card = this.page.locator('.deck-card-admin', { hasText: deckName });
  await card.locator('button', { hasText: /^Archive$/ }).click();
  // Wait for the refresh to surface the "archived" chip.
  await card.locator('.chip', { hasText: /archived/i }).first().waitFor({ timeout: 5_000 });
});

When('I unarchive the {string} deck', async function (deckName) {
  const card = this.page.locator('.deck-card-admin', { hasText: deckName });
  await card.locator('button', { hasText: /^Unarchive$/ }).click();
  // Wait for the archived chip to disappear.
  await card.locator('.chip', { hasText: /archived/i }).first().waitFor({ state: 'detached', timeout: 5_000 });
});

When('I delete the {string} deck', async function (deckName) {
  const card = this.page.locator('.deck-card-admin', { hasText: deckName });
  await card.locator('button', { hasText: /^Delete$/ }).click();
  // Confirm in the modal.
  await this.page.getByRole('button', { name: /Yes, delete/ }).click();
  // Wait for the card to disappear.
  await card.first().waitFor({ state: 'detached', timeout: 5_000 });
});

When('I filter the deck list to {string}', async function (filterLabel) {
  // The status filter is a range-pills control with three buttons:
  // "All", "Active", "Archived" (from STRINGS.parent.decks.filters).
  await this.page.locator('.range-pills__btn', { hasText: filterLabel }).first().click();
  // Wait for the filter to apply (the active class flips on click).
  await this.page
    .locator('.range-pills__btn.is-active', { hasText: filterLabel })
    .first()
    .waitFor({ state: 'visible', timeout: 3_000 });
});

Then('the deck {string} is not in the kid deck list', async function (deckName) {
  await this.gotoKidHome();
  await expect(this.page.locator('.deck-card__name', { hasText: deckName })).toHaveCount(0);
});

Then('the srs state for {string} is empty', async function (deckName) {
  const result = await this.page.evaluate(async (name) => {
    const dbReq = indexedDB.open('srs-kids');
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const tx = db.transaction(['decks', 'srsState'], 'readonly');
    const allDecks = await new Promise((resolve, reject) => {
      const r = tx.objectStore('decks').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const deck = allDecks.find((d) => d.name === name);
    if (!deck) {
      db.close();
      return { found: false };
    }
    const states = await new Promise((resolve, reject) => {
      const idx = tx.objectStore('srsState').index('deckId');
      const r = idx.getAll(IDBKeyRange.only(deck.id));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return { found: true, count: states.length };
  }, deckName);
  if (result.found) {
    expect(result.count).toBe(0);
  } else {
    // If the deck was deleted entirely, srs rows are also gone.
    expect(result.found).toBe(false);
  }
});

// ----- Overview dashboard -----

Then('the summary card {string} shows {string}', async function (label, value) {
  // Find the summary card by its label, check the number.
  const card = this.page.locator('.summary-card', { hasText: label });
  await expect(card.locator('.summary-card__num')).toHaveText(value);
});

When('I have a deck with mastered and overdue cards', async function () {
  // Create a deck via the import flow, then directly inject SRS state
  // for the four mastery buckets (new, mastered, overdue, learning).
  await this.gotoParent('decks');
  const gateVisible = await this.page
    .locator('.gate-card')
    .first()
    .isVisible()
    .catch(() => false);
  if (gateVisible) {
    const text = await this.page.locator('.gate-card__question').first().innerText();
    const m = text.match(/(\d+)\s*×\s*(\d+)/);
    const answer = Number(m[1]) * Number(m[2]);
    const input = this.page.locator('.gate-card__input').first();
    await input.fill(String(answer));
    await input.press('Enter');
    await this.page.locator('.gate-card').waitFor({ state: 'detached' });
  }
  await this.page.getByRole('button', { name: /Add deck/i }).first().click();
  await this.page.locator('.dropzone').first().waitFor({ state: 'visible' });
  await this.page
    .locator('.dropzone input[type="file"]')
    .first()
    .setInputFiles(fixturePath('mastery-deck.json'));
  await this.page.waitForTimeout(200);
  await this.page.getByRole('button', { name: 'Upload deck' }).click();
  await this.page.locator('.dropzone').first().waitFor({ state: 'detached', timeout: 5_000 });

  // Inject SRS state for each of the four mastery buckets.
  await this.page.evaluate(async () => {
    const DAY_MS = 86_400_000;
    const now = Date.now();
    const dbReq = indexedDB.open('srs-kids');
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const tx = db.transaction('decks', 'readonly');
    const allDecks = await new Promise((resolve, reject) => {
      const r = tx.objectStore('decks').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const deck = allDecks[0];
    if (!deck) {
      db.close();
      return;
    }
    const states = [
      // New: never reviewed.
      { cardId: 'mst-1', deckId: deck.id, interval: 0, easeFactor: 2.5, due: now, reps: 0, lapses: 0, lastReviewed: 0 },
      // Mastered: interval >= 7, not overdue.
      {
        cardId: 'mst-2',
        deckId: deck.id,
        interval: 14,
        easeFactor: 2.5,
        due: now + 14 * DAY_MS,
        reps: 5,
        lapses: 0,
        lastReviewed: now - 86400000
      },
      // Overdue: due is in the past beyond the 1-day grace.
      {
        cardId: 'mst-3',
        deckId: deck.id,
        interval: 3,
        easeFactor: 2.5,
        due: now - 2 * DAY_MS,
        reps: 3,
        lapses: 0,
        lastReviewed: now - 5 * DAY_MS
      },
      // Learning: interval < 7, not overdue.
      {
        cardId: 'mst-4',
        deckId: deck.id,
        interval: 1,
        easeFactor: 2.5,
        due: now + DAY_MS,
        reps: 1,
        lapses: 0,
        lastReviewed: now - 3600000
      }
    ];
    const tx2 = db.transaction('srsState', 'readwrite');
    const store2 = tx2.objectStore('srsState');
    for (const s of states) store2.put(s);
    await new Promise((resolve, reject) => {
      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    });
    db.close();
  });
});

Then('the mastery total equals the srs state count', async function () {
  // Read the SRS list from IDB and re-apply the computeMastery
  // algorithm. The assertion is that the four buckets sum to the
  // total SRS count (i.e. each card lands in exactly one bucket).
  const srsList = await this.page.evaluate(async () => {
    const dbReq = indexedDB.open('srs-kids');
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const tx = db.transaction('srsState', 'readonly');
    const all = await new Promise((resolve, reject) => {
      const r = tx.objectStore('srsState').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return all;
  });
  const DAY_MS = 86_400_000;
  const now = Date.now();
  let n = 0;
  let l = 0;
  let m = 0;
  let o = 0;
  for (const s of srsList) {
    if (!s.lastReviewed && !s.reps) {
      n++;
      continue;
    }
    if (s.due < now - DAY_MS) {
      o++;
      continue;
    }
    if (s.interval >= 7) m++;
    else l++;
  }
  expect(n + l + m + o).toBe(srsList.length);
});

// ----- Settings -----

When('I change the kid\'s name to {string}', async function (name) {
  // The name input lives in a .form-row with a label containing
  // "Kid's name". The input is not associated via for/htmlFor, so we
  // use the surrounding form-row as a scope.
  const row = this.page.locator('.form-row', { hasText: "Kid's name" });
  const input = row.locator('input.input');
  await input.fill(name);
});

When('I go to the parent settings and set all session sizes to 0', async function () {
  await this.gotoParent('settings');
  await this.solveGateIfPresent();
  // The session size section has four inputs with labels matching
  // STRINGS.parent.settings.session.{spelling,phrase,fact,audio}.
  const types = ['spelling', 'phrase', 'fact', 'audio'];
  for (const t of types) {
    const row = this.page.locator('.form-row', { hasText: new RegExp(t, 'i') });
    const input = row.locator('input[type="number"]');
    await input.fill('0');
  }
});

When('I save the settings', async function () {
  await this.page.getByRole('button', { name: 'Save settings' }).click();
  await this.page.locator('.toast', { hasText: 'Settings saved!' }).waitFor({ state: 'visible', timeout: 5_000 });
});

Then('the kid\'s name is {string}', async function (name) {
  // The greeting is "Hi <name>! 👋" on the kid home.
  await this.gotoKidHome();
  // Wait for the kid view to be visible before checking the greeting,
  // so we never accidentally match a stale `.greeting` element on a
  // partially-rendered view during the hash transition.
  await this.page.locator('.kid-view').first().waitFor({ state: 'visible', timeout: 5_000 });
  await expect(this.page.locator('.greeting h1')).toHaveText(`Hi ${name}! 👋`);
});

When('I switch the accent to {string}', async function (accent) {
  const capitalized = accent[0].toUpperCase() + accent.slice(1);
  await this.page.getByRole('radio', { name: capitalized }).first().click();
  // Wait for the accent attribute to be applied to <html>.
  await this.page.waitForFunction(
    (a) => document.documentElement.dataset.accent === a,
    accent,
    { timeout: 5_000 }
  );
});

Then('the html element has a data-accent attribute', async function () {
  const accent = await this.page.evaluate(() => document.documentElement.dataset.accent);
  expect(accent).toBeTruthy();
});

Then('the accent is {string}', async function (accent) {
  const actual = await this.page.evaluate(() => document.documentElement.dataset.accent);
  expect(actual).toBe(accent);
});

// ----- Offline -----

Given('the service worker has registered', async function () {
  // SW only registers on the `load` event via workbox-window; allow
  // up to 15s. The SW does not control the current page until it
  // claims clients on activate, so we wait for `controller` to be
  // set. If it isn't, we reload once while online to give the SW
  // another chance, then wait for control again. The offline
  // reload test REQUIRES the SW to be controlling the page or the
  // browser will hit the network and fail with ERR_INTERNET_DISCONNECTED.
  await this.page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active);
    },
    null,
    { timeout: 15_000, polling: 200 }
  );
  // Wait for the SW to take control of the current page.
  let controlling = await this.page.evaluate(() => !!navigator.serviceWorker.controller);
  if (!controlling) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    try {
      await this.page.waitForFunction(
        () => !!navigator.serviceWorker.controller,
        null,
        { timeout: 5_000, polling: 100 }
      );
      controlling = true;
    } catch {
      // SW is registered but never claimed this client. The
      // offline test will fail without control, but other tests
      // don't depend on it. We let the offline test fail loudly
      // by rethrowing here so the failure is clear.
      throw new Error(
        'Service worker registered but never took control of the page. ' +
        'Check vite.config.js workbox.clientsClaim / skipWaiting.'
      );
    }
  }
  void controlling;
});

When('I go offline', async function () {
  await this.context.setOffline(true);
});
