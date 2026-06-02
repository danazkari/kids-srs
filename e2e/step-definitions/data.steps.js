// Data step definitions: PWA foundation, IndexedDB assertions, deck import
// flow, theme switching. Covers features 01, 02, 03.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { fixturePath } from '../support/paths.js';

// ----- PWA foundation -----

When('I fetch the manifest', async function () {
  const res = await this.page.evaluate(async () => {
    const r = await fetch('/manifest.webmanifest');
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, json: await r.json() };
  });
  expect(res.ok).toBe(true);
  this.manifest = res.json;
});

Then('the manifest has a non-empty name', async function () {
  expect(this.manifest).toBeTruthy();
  expect(typeof this.manifest.name).toBe('string');
  expect(this.manifest.name.length).toBeGreaterThan(0);
});

Then('the manifest has at least one icon', async function () {
  expect(Array.isArray(this.manifest.icons)).toBe(true);
  expect(this.manifest.icons.length).toBeGreaterThan(0);
});

Then('the manifest has a start_url', async function () {
  expect(typeof this.manifest.start_url).toBe('string');
  expect(this.manifest.start_url.length).toBeGreaterThan(0);
});

Then('a service worker is registered for the app scope', async function () {
  // SW only registers on the `load` event via workbox-window and the
  // dynamic import of workbox-window is async. Give it up to 15s.
  await this.page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active);
    },
    null,
    { timeout: 15_000, polling: 200 }
  );
});

Then('the html element has a data-theme attribute', async function () {
  const theme = await this.page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBeTruthy();
  expect(['light', 'dark']).toContain(theme);
});

Then('I see the parent gate', async function () {
  await expect(this.page.locator('.gate-card').first()).toBeVisible();
});

Then('I see the kid home page', async function () {
  await expect(this.page.locator('.kid-view').first()).toBeVisible();
});

// ----- Data setup -----

Given('I have solved the parent gate', async function () {
  // No-op when the gate is not visible (e.g. sessionStorage is already
  // authenticated for the test context).
  const gateVisible = await this.page
    .locator('.gate-card')
    .first()
    .isVisible()
    .catch(() => false);
  if (!gateVisible) return;
  const text = await this.page.locator('.gate-card__question').first().innerText();
  const m = text.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) throw new Error(`Could not parse math challenge: ${text}`);
  const answer = Number(m[1]) * Number(m[2]);
  const input = this.page.locator('.gate-card__input').first();
  await input.fill(String(answer));
  await input.press('Enter');
  await this.page.locator('.gate-card').waitFor({ state: 'detached', timeout: 5_000 });
});

Given('I have cleared the database', async function () {
  await this.clearAllStorage();
  // Re-boot the app so it re-reads from clean storage. The Before hook
  // already cleared at scenario start; this step is for explicit
  // mid-scenario resets.
  await this.gotoKidHome();
  await this.page.waitForLoadState('domcontentloaded');
  // The default profile is created on boot; wait for the kid view.
  await this.page.locator('.kid-view').first().waitFor({ state: 'visible', timeout: 10_000 });
});

// ----- Deck import flow -----

When('I open the add deck modal', async function () {
  // Button text is "+ Add deck" (the literal "+ " prefix + STRINGS.addButton).
  await this.page.getByRole('button', { name: /Add deck/i }).first().click();
  await this.page.locator('.dropzone').first().waitFor({ state: 'visible' });
});

When('I import the deck file {string}', async function (filename) {
  const path = fixturePath(filename);
  // The hidden file input lives inside .dropzone. Playwright's
  // setInputFiles works on hidden inputs directly.
  const fileInput = this.page.locator('.dropzone input[type="file"]').first();
  await fileInput.setInputFiles(path);
  // Give the onChange handler a tick to parse + validate.
  await this.page.waitForTimeout(200);
});

Then('I see an error containing {string}', async function (substring) {
  const alert = this.page.locator('.alert--error').first();
  await expect(alert).toBeVisible();
  const text = (await alert.innerText()).toLowerCase();
  expect(text).toContain(substring.toLowerCase());
});

Then('I see a warning', async function () {
  await expect(this.page.locator('.alert--warn').first()).toBeVisible();
});

Then('I see the deck preview', async function () {
  await expect(this.page.locator('.alert--success').first()).toBeVisible();
});

Then('the deck {string} is in the deck list', async function (deckName) {
  await expect(
    this.page.locator('.deck-card-admin__name', { hasText: deckName }).first()
  ).toBeVisible();
});

Then('the deck {string} is not in the deck list', async function (deckName) {
  await expect(
    this.page.locator('.deck-card-admin__name', { hasText: deckName })
  ).toHaveCount(0);
});

Then('the deck is not in the deck list', async function () {
  // Used after a failed import: the malformed file was rejected, so
  // there should be zero deck cards in the parent Decks list.
  await expect(this.page.locator('.deck-card-admin__name')).toHaveCount(0);
});

Then('the deck {string} is available on the kid home', async function (deckName) {
  await this.gotoKidHome();
  await expect(
    this.page.locator('.deck-card__name', { hasText: deckName }).first()
  ).toBeVisible();
});

Then('a profile exists in the database', async function () {
  const result = await this.page.evaluate(async () => {
    try {
      const dbReq = indexedDB.open('srs-kids');
      const db = await new Promise((resolve, reject) => {
        dbReq.onsuccess = () => resolve(dbReq.result);
        dbReq.onerror = () => reject(dbReq.error);
        dbReq.onblocked = () => reject(new Error('blocked'));
      });
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get('current');
      const row = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return row && row.value ? { ok: true } : { ok: false };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
  expect(result.ok).toBe(true);
});

// ----- Theme switching -----

async function resolveThemeName(page, theme) {
  if (theme === 'system') {
    return page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
  }
  return theme;
}

When('I switch the theme to {string}', async function (theme) {
  const capitalized = theme[0].toUpperCase() + theme.slice(1);
  await this.page.getByRole('radio', { name: capitalized }).first().click();
  const expected = await resolveThemeName(this.page, theme);
  await this.page.waitForFunction(
    (t) => document.documentElement.dataset.theme === t,
    expected,
    { timeout: 5_000 }
  );
});

Then('the theme is {string}', async function (theme) {
  const expected = await resolveThemeName(this.page, theme);
  const actual = await this.page.evaluate(() => document.documentElement.dataset.theme);
  expect(actual).toBe(expected);
});
