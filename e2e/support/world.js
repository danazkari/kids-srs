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
  async gotoKidHome() {
    await this.page.goto(`${this.serverUrl}/#/`);
  }

  async gotoSession(deckId) {
    await this.page.goto(`${this.serverUrl}/#/session?deck=${encodeURIComponent(deckId)}`);
  }

  async gotoParent(tab = 'overview') {
    await this.page.goto(`${this.serverUrl}/#/parent/${tab}`);
  }
}
