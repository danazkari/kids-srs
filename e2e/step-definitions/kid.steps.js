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
  const deckId = await this.getDeckIdByName(deckName);
  if (!deckId) throw new Error(`Deck "${deckName}" not found in database`);
  await this.gotoSession(deckId);
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

Then('I do not see the resume modal', async function () {
  await expect(this.page.getByText("Welcome back!")).toHaveCount(0);
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

When('I click the done screen home button', async function () {
  await this.page.locator('.done-screen button').first().click();
  await this.gotoKidHome();
  await this.page.waitForLoadState('networkidle');
});

When('I advance through all remaining cards', async function () {
  // Keep grading the current card as "I knew it" until the done screen appears.
  // Each grade auto-advances for phrase/audio cards.
  let attempts = 0;
  while (attempts < 20) {
    const doneVisible = await this.page.locator('.done-screen').first().isVisible().catch(() => false);
    if (doneVisible) break;
    // Wait for a flippable card to be visible.
    const flippable = this.page.locator('.card-area .study-card--flippable');
    try {
      await flippable.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      // No more flippable cards — we might be on a non-flippable card or done.
      break;
    }
    await flippable.click();
    // Grade as "I knew it"
    const gradeBtn = this.page
      .locator('.grade-row .grade-btn', { hasText: /I knew it/i })
      .first();
    await gradeBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await gradeBtn.click();
    attempts++;
  }
});

// ----- Timed sessions -----

When('I start a timed session for the {string} deck with {string} minutes', async function (deckName, mins) {
  const deckId = await this.getDeckIdByName(deckName);
  if (!deckId) throw new Error(`Deck "${deckName}" not found in database`);
  await this._navigate(`/session?deck=${encodeURIComponent(deckId)}&timer=${mins}`);
  await this.page.locator('.kid-session').first().waitFor({ state: 'visible', timeout: 10_000 });
});

When('I start a timed session for the {string} deck with {string} minute', async function (deckName, mins) {
  const deckId = await this.getDeckIdByName(deckName);
  if (!deckId) throw new Error(`Deck "${deckName}" not found in database`);
  await this._navigate(`/session?deck=${encodeURIComponent(deckId)}&timer=${mins}`);
  await this.page.locator('.kid-session').first().waitFor({ state: 'visible', timeout: 10_000 });
});

Then('I see a timer bar showing {string}', async function (timeStr) {
  // timeStr is like "5:00" - check if the timer bar shows this time
  const timerBar = this.page.locator('.timer-bar');
  await expect(timerBar).toBeVisible({ timeout: 5_000 });
  // Check that the timer text contains the expected time
  await expect(timerBar.locator('.timer-bar__time')).toContainText(timeStr.replace(':00', ''));
});

When('I click the pause button', async function () {
  const pauseBtn = this.page.locator('.timer-bar__pause-btn');
  await pauseBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await pauseBtn.click();
});

Then('the timer shows {string}', async function (expected) {
  const timeEl = this.page.locator('.timer-bar__time');
  await expect(timeEl).toContainText(expected);
});

When('I wait for the timer to expire', async function () {
  // Wait for the timer bar to show 0:00 or disappear (timer expired)
  // Poll until timer reaches zero or we're done
  let attempts = 0;
  while (attempts < 120) { // up to 2 minutes
    const doneVisible = await this.page.locator('.done-screen').first().isVisible().catch(() => false);
    if (doneVisible) break;
    const timeText = await this.page.locator('.timer-bar__time').first().innerText().catch(() => '');
    if (timeText.includes('00:0') || timeText === '00:00') break;
    await this.page.waitForTimeout(1000);
    attempts++;
  }
});

When('I complete the current card', async function () {
  // Try to advance the current card - depends on card type
  const doneVisible = await this.page.locator('.done-screen').first().isVisible().catch(() => false);
  if (doneVisible) return;

  // Check if there's a Next button (spelling card after answer)
  const nextBtn = this.page.locator('button', { hasText: 'Next' }).first();
  if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await nextBtn.click();
    return;
  }

  // For phrase/audio cards, grade and advance
  const flippable = this.page.locator('.card-area .study-card--flippable');
  if (await flippable.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await flippable.click();
    const gradeBtn = this.page.locator('.grade-row .grade-btn', { hasText: /I knew it/i }).first();
    if (await gradeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await gradeBtn.click();
    }
  }
});

Then('the session record has timerMinutes set to {string}', async function (mins) {
  const result = await this.page.evaluate(async () => {
    const dbReq = indexedDB.open('srs-kids');
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const tx = db.transaction('sessions', 'readonly');
    const all = await new Promise((resolve, reject) => {
      const r = tx.objectStore('sessions').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    const last = all.sort((a, b) => b.startedAt - a.startedAt)[0];
    return last ? { timerMinutes: last.timerMinutes, endedByTimer: last.endedByTimer } : null;
  });
  expect(result).not.toBeNull();
  expect(result.timerMinutes).toBe(Number(mins));
});

Then('the session record has endedByTimer set to {string}', async function (val) {
  const result = await this.page.evaluate(async () => {
    const dbReq = indexedDB.open('srs-kids');
    const db = await new Promise((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const tx = db.transaction('sessions', 'readonly');
    const all = await new Promise((resolve, reject) => {
      const r = tx.objectStore('sessions').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    const last = all.sort((a, b) => b.startedAt - a.startedAt)[0];
    return last ? { endedByTimer: last.endedByTimer } : null;
  });
  expect(result).not.toBeNull();
  expect(result.endedByTimer).toBe(val === 'true');
});

// ----- Home page timer UI -----

Then('the {string} deck shows a {string} button', async function (deckName, btnText) {
  const card = this.page.locator('.deck-card', { hasText: deckName });
  const btn = card.locator('button.deck-card__cta', { hasText: new RegExp(btnText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(btn).toBeVisible();
});

Then('the {string} deck shows a timer dropdown', async function (deckName) {
  const card = this.page.locator('.deck-card', { hasText: deckName });
  const timerBtn = card.locator('button.deck-card__cta--timer');
  await expect(timerBtn).toBeVisible();
});

Then('the {string} deck shows a {string} timer button', async function (deckName, timeText) {
  const card = this.page.locator('.deck-card', { hasText: deckName });
  const timerBtn = card.locator('button.deck-card__cta--timer', { hasText: new RegExp(timeText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(timerBtn).toBeVisible();
});

Then('the timer bar is visible', async function () {
  await expect(this.page.locator('.timer-bar')).toBeVisible();
});

When('I click the pause button again', async function () {
  const pauseBtn = this.page.locator('.timer-bar__pause-btn');
  await pauseBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await pauseBtn.click();
});
