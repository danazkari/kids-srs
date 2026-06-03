// Common step definitions: navigation, generic interactions, assertions.
// These are reused by every feature file.

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// ----- Navigation -----

Given('I am on the kid home page', async function () {
  await this.gotoKidHome();
  await this.page.waitForLoadState('domcontentloaded');
});

Given('I am on the session page for deck {string}', async function (deckId) {
  await this.gotoSession(deckId);
  await this.page.waitForLoadState('domcontentloaded');
});

Given('I am on the parent {string} tab', async function (tab) {
  await this.gotoParent(tab);
  await this.page.waitForLoadState('domcontentloaded');
});

When('I navigate to {string}', async function (hash) {
  // hash is expected to start with '#'
  const target = hash.startsWith('#') ? hash : `#${hash}`;
  await this.page.evaluate((h) => {
    window.location.hash = h;
  }, target);
  // Preact re-renders on the next microtask; 100ms is a safe margin.
  await this.page.waitForTimeout(100);
});

// ----- Generic interactions -----

When('I click {string}', async function (label) {
  await this.page.getByRole('button', { name: label, exact: false }).first().click();
});

When('I click the {string} deck', async function (name) {
  // Find the deck card on the kid home by its name, then click the
  // "Start" CTA button. Clicking the name text does nothing — only
  // the CTA navigates to the session.
  const card = this.page.locator('.deck-card', { hasText: name });
  await card.locator('button.deck-card__cta').first().click();
  await this.page.locator('.kid-session').first().waitFor({ state: 'visible', timeout: 10_000 });
});

When('I type {string} into the {string} field', async function (value, fieldLabel) {
  await this.page.getByLabel(fieldLabel, { exact: false }).first().fill(value);
});

When('I type {string} for the math challenge', async function (value) {
  const input = this.page.locator('input[type="number"]').first();
  await input.fill(value);
  await input.press('Enter');
});

When('I solve the math challenge', async function () {
  const text = await this.page.locator('.gate-card__question').first().innerText();
  const m = text.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) throw new Error(`Could not parse math challenge: ${text}`);
  const answer = Number(m[1]) * Number(m[2]);
  const input = this.page.locator('input[type="number"]').first();
  await input.fill(String(answer));
  await input.press('Enter');
  // Wait for the gate to disappear.
  await this.page.locator('.gate-card').waitFor({ state: 'detached', timeout: 5_000 });
});

When('I reload the page', async function () {
  await this.page.reload({ waitUntil: 'domcontentloaded' });
});

// ----- Assertions -----

Then('I see {string}', async function (text) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('I do not see {string}', async function (text) {
  await expect(this.page.getByText(text, { exact: false })).toHaveCount(0);
});

Then('the URL hash is {string}', async function (hash) {
  const actual = await this.page.evaluate(() => window.location.hash);
  expect(actual).toBe(hash);
});

When('I navigate to the session for the {string} deck', async function (deckName) {
  const deckId = await this.getDeckIdByName(deckName);
  if (!deckId) throw new Error(`Deck "${deckName}" not found in database`);
  await this.gotoSession(deckId);
  await this.page.waitForLoadState('domcontentloaded');
});
