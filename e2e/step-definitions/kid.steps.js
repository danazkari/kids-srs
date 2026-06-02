// Kid view step definitions: session interactions, card grading,
// resume, leave, done screen, badges modal.

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Per-step timeout: 30s. The default 5s is too tight for grading
// steps that have to wait for an async IDB write + a Preact
// re-render before the next grade button appears.
setDefaultTimeout(30_000);

// ----- Deck import + session start -----

When('I import the {string} deck', async function (fixtureName) {
  await this.importDeck(fixtureName);
});

When('I import and activate the {string} deck', async function (fixtureName) {
  // Imported decks are active by default, so "import" == "import + activate".
  await this.importDeck(fixtureName);
});

When('I start a session for the {string} deck', async function (deckName) {
  await this.gotoKidHome();
  await this.page.locator('.kid-view').first().waitFor({ state: 'visible' });
  // The deck card has a "Start" CTA.
  const deckCard = this.page.locator('.deck-card', { hasText: deckName });
  await deckCard.locator('button.deck-card__cta').first().click();
  await this.page.locator('.kid-session').first().waitFor({ state: 'visible', timeout: 10_000 });
});

When('I am on the session page for the {string} deck', async function (deckName) {
  const deckId = await this.getDeckIdByName(deckName);
  if (!deckId) throw new Error(`Deck "${deckName}" not found in database`);
  await this.gotoSession(deckId);
  await this.page.locator('.kid-session').first().waitFor({ state: 'visible', timeout: 10_000 });
});

// ----- Session interactions -----

When('I click the leave button', async function () {
  // The home icon in the kid top bar.
  await this.page.locator('.icon-btn[aria-label="home"]').first().click();
  // Wait for the leave confirm modal.
  await this.page.locator('.modal').first().waitFor({ state: 'visible' });
});

Then('I see the leave confirm modal', async function () {
  await expect(this.page.getByText('Leave this session?')).toBeVisible();
});

Then('I do not see the leave confirm modal', async function () {
  await expect(this.page.getByText('Leave this session?')).toHaveCount(0);
});

Then('I see the resume modal', async function () {
  await expect(this.page.getByText("Welcome back!")).toBeVisible();
});

// ----- Spelling card -----

When('I type {string} and submit the spelling card', async function (word) {
  for (const letter of word.toLowerCase()) {
    if (/^[a-z]$/.test(letter)) {
      // The OSK key button has the letter as text. Use exact match so
      // we don't accidentally click the Enter key (↵) when the letter
      // is "e" (which appears in "Enter").
      await this.page
        .locator('.osk-key:not(.osk-key--enter):not(.osk-key--back)')
        .filter({ hasText: new RegExp(`^${letter}$`) })
        .first()
        .click();
    }
  }
  await this.page.locator('.osk-key--enter').first().click();
});

Then('I see the spelling card is correct', async function () {
  await expect(this.page.locator('.letter-box--correct').first()).toBeVisible();
});

Then('I see the spelling card is wrong', async function () {
  await expect(this.page.locator('.letter-box--wrong').first()).toBeVisible();
});

// ----- Phrase / Audio card grading -----

async function gradeFlippableCard(world, grade) {
  // The grade buttons only appear after a flippable card is flipped.
  // The card area re-mounts on every card change (key=card.id), so
  // we always find the current `.study-card--flippable` element and
  // click it. PhraseCard has a single `<div onClick>` for the
  // flippable; AudioCard uses the same pattern. After the flip the
  // grade buttons appear inside `.grade-row`.
  const cardArea = world.page.locator('.card-area');
  // Wait for the card area to settle. A fresh PhraseCard mounts with
  // `anim-fade` (0.3s), so we wait for the flippable to be visible
  // AND the animation to complete (auto-wait inside .click()).
  const flippable = cardArea.locator('.study-card--flippable');
  await flippable.waitFor({ state: 'visible', timeout: 10_000 });
  await flippable.click();
  // Now the grade buttons are visible inside the same card.
  const gradeBtn = cardArea
    .locator('.grade-row .grade-btn', { hasText: new RegExp(grade, 'i') })
    .first();
  await gradeBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await gradeBtn.click();
}

When('I grade the phrase card as {string}', async function (grade) {
  await gradeFlippableCard(this, grade);
});

When('I grade the audio card as {string}', async function (grade) {
  await gradeFlippableCard(this, grade);
});

When('I grade the current card as {string}', async function (grade) {
  await gradeFlippableCard(this, grade);
});

// ----- Done screen -----

Then('I see the done screen', async function () {
  await expect(this.page.locator('.done-screen').first()).toBeVisible();
});

Then('the done screen shows {string} cards reviewed', async function (count) {
  const num = this.page.locator('.done-screen .done-stat__num').first();
  await expect(num).toHaveText(count);
});

// ----- Badges modal -----

When('I open the badges modal', async function () {
  await this.gotoKidHome();
  await this.page.locator('.badge-fab').first().click();
  await this.page.locator('.badge-grid').first().waitFor({ state: 'visible' });
});

Then('I see {string} in the badges modal', async function (badgeName) {
  // The badge name appears in the grid (or "???" for locked ones).
  await expect(
    this.page.locator('.badge-grid .badge-item__name', { hasText: badgeName }).first()
  ).toBeVisible();
});

Then('the done screen shows the {string} badge', async function (badgeName) {
  // BadgeModal pops up ~600ms after the done screen.
  await expect(this.page.getByText(badgeName).first()).toBeVisible({ timeout: 5_000 });
});

Then('I see a study card', async function () {
  await expect(this.page.locator('.card-area').first()).toBeVisible({ timeout: 10_000 });
});
