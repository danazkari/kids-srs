// Custom World shared across all step definitions.
// Holds the Playwright browser context, the current page, and a
// reference to the server URL exposed by e2e/support/server.js.
//
// The browser itself is launched once per suite in e2e/support/hooks.js
// (BeforeAll) to avoid the chromium SIGSEGV on repeated launches in
// this container. Each scenario gets a fresh context.

import { World } from '@cucumber/cucumber';
import { getBrowser } from './browser.js';
import { getServerUrl } from './server.js';
import { fixturePath } from './paths.js';

export class SRSWorld extends World {
  constructor(opts) {
    super(opts);
    this.context = null;
    this.page = null;
    this.screenshotOnFailure = true;
  }

  get serverUrl() {
    return getServerUrl();
  }

  get browser() {
    return getBrowser();
  }

  async openContext() {
    this.context = await this.browser.newContext({
      viewport: { width: 414, height: 896 }, // iPhone-ish, kid device size
      deviceScaleFactor: 2,
      // Make the SW path predictable; the app only registers in prod.
      serviceWorkers: 'allow'
    });
    this.context.on('weberror', (err) => {
      if (process.env.E2E_DEBUG) process.stderr.write(`[page-error] ${err.error()}\n`);
    });
    this.page = await this.context.newPage();
  }

  async closeContext() {
    try {
      if (this.page) await this.page.close();
    } catch {
      /* ignore */
    }
    try {
      if (this.context) await this.context.close();
    } catch {
      /* ignore */
    }
    this.page = null;
    this.context = null;
  }

  async clearAllStorage() {
    // Clear all client-side state: IDB, localStorage, sessionStorage, cookies.
    if (!this.page) return;
    await this.page.goto('about:blank');
    await this.page.evaluate(async () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Drop every IndexedDB database.
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(
              (db) =>
                new Promise((resolve) => {
                  if (!db.name) return resolve();
                  const req = indexedDB.deleteDatabase(db.name);
                  req.onsuccess = req.onerror = req.onblocked = () => resolve();
                })
            )
          );
        }
      } catch {
        /* ignore */
      }
    });
  }

  // Navigation helpers — the app is hash-routed, so URLs are /#/path.
  // Strategy: when we're not yet on a page from this app (about:blank
  // or some other origin), use `page.goto` to do a real navigation.
  // When we're already on a page from this app, set `window.location.hash`
  // directly so the browser fires `hashchange` and the router re-renders
  // — `page.goto` to a hash-only URL change has been observed to leave
  // the page stale (the URL updates but the router listener never fires).
  async gotoKidHome() {
    await this._navigate('/');
  }

  async gotoSession(deckId) {
    await this._navigate(`/session?deck=${encodeURIComponent(deckId)}`);
  }

  async gotoParent(tab = 'overview') {
    await this._navigate(`/parent/${tab}`);
  }

  async _navigate(hashPath) {
    const targetUrl = `${this.serverUrl}/#${hashPath}`;
    const sameOrigin = await this.page
      .evaluate((u) => {
        try {
          return new URL(u, window.location.href).origin === window.location.origin;
        } catch {
          return false;
        }
      }, targetUrl)
      .catch(() => false);
    if (!sameOrigin || (await this.page.evaluate(() => window.location.protocol)) === 'about:') {
      // No app loaded yet — do a real navigation.
      await this.page.goto(targetUrl);
      return;
    }
    // Already on the app: set the hash so hashchange fires.
    const targetHash = '#' + hashPath;
    const currentHash = await this.page.evaluate(() => window.location.hash);
    if (currentHash === targetHash) return; // already there
    await this.page.evaluate((h) => {
      window.location.hash = h;
    }, hashPath);
  }

  // Look up a deck's UUID by its human-readable name. Returns null if
  // not found. Used by step definitions that need to navigate to a
  // session for a deck without hardcoding the UUID.
  async getDeckIdByName(name) {
    return this.page.evaluate(async (n) => {
      const dbReq = indexedDB.open('srs-kids');
      const db = await new Promise((resolve, reject) => {
        dbReq.onsuccess = () => resolve(dbReq.result);
        dbReq.onerror = () => reject(dbReq.error);
      });
      const tx = db.transaction('decks', 'readonly');
      const all = await new Promise((resolve, reject) => {
        const r = tx.objectStore('decks').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      const deck = all.find((d) => d.name === n);
      return deck ? deck.id : null;
    }, name);
  }

  // Solve the parent math gate if it is currently visible. No-op
  // when the gate isn't on screen. Used by step definitions that
  // need the gate out of the way before interacting with the parent
  // Decks tab.
  async solveGateIfPresent() {
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
  }

  // Full import flow for a fixture deck file: navigate to parent
  // Decks, solve the gate, open the modal, set the file, click
  // Upload, wait for the modal to close. Imported decks are
  // active by default. The caller is left on the parent "decks"
  // tab; features that want to interact with the kid view should
  // explicitly navigate to kid home afterwards.
  // Accepts the fixture name with or without the .json extension.
  async importDeck(fixtureName) {
    const fileName = fixtureName.endsWith('.json') ? fixtureName : `${fixtureName}.json`;
    await this.gotoParent('decks');
    await this.solveGateIfPresent();
    await this.page.getByRole('button', { name: /Add deck/i }).first().click();
    await this.page.locator('.dropzone').first().waitFor({ state: 'visible' });
    await this.page
      .locator('.dropzone input[type="file"]')
      .first()
      .setInputFiles(fixturePath(fileName));
    await this.page.waitForTimeout(200);
    await this.page.getByRole('button', { name: 'Upload deck' }).click();
    await this.page.locator('.dropzone').first().waitFor({ state: 'detached', timeout: 5_000 });
  }
}
