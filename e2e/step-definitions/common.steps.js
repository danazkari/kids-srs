// Common step definitions: navigation, generic interactions, assertions.
// These are reused by every feature file.

import { Given, Then, When } from '@cucumber/cucumber';
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

// ----- Generic interactions -----

When('I click {string}', async function (label) {
  await this.page.getByRole('button', { name: label, exact: false }).first().click();
});

When('I click the {string} deck', async function (name) {
  await this.page.getByText(name, { exact: false }).first().click();
});

When('I type {string} into the {string} field', async function (value, fieldLabel) {
  await this.page.getByLabel(fieldLabel, { exact: false }).first().fill(value);
});

When('I type {string} for the math challenge', async function (value) {
  // The math gate renders an input without a stable label; pick the
  // only number input on the page.
  const input = this.page.locator('input[type="number"]').first();
  await input.fill(value);
  await input.press('Enter');
});

When('I solve the math challenge', async function () {
  const text = await this.page.locator('.gate-card__question').first().innerText();
  // Text looks like "3 × 5 = ?"
  const m = text.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) throw new Error(`Could not parse math challenge: ${text}`);
  const answer = Number(m[1]) * Number(m[2]);
  const input = this.page.locator('input[type="number"]').first();
  await input.fill(String(answer));
  await input.press('Enter');
});

// ----- Assertions -----

Then('I see {string}', async function (text) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('I do not see {string}', async function (text) {
  await expect(this.page.getByText(text, { exact: false })).toHaveCount(0);
});

Then('the URL hash is {string}', async function (hash) {
  // hash includes the leading #
  const actual = await this.page.evaluate(() => window.location.hash);
  expect(actual).toBe(hash);
});
