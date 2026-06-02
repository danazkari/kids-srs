// Cucumber hooks: build the app, start the preview server, manage
// the browser context, capture screenshots on failure.
//
// Note: `this` in BeforeAll/AfterAll is NOT the World instance —
// cucumber-js 13 sets it to a fresh { parameters } object. State must
// be shared via module-level exports (e.g. server.getServerUrl()).

import { Before, BeforeAll, After, AfterAll, setWorldConstructor } from '@cucumber/cucumber';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SRSWorld } from './world.js';
import { startServer, stopServer } from './server.js';

const REPORTS_DIR = 'e2e/reports';
const SCREENSHOTS_DIR = 'e2e/screenshots';

setWorldConstructor(SRSWorld);

BeforeAll({ timeout: 120_000 }, async function () {
  await mkdir(REPORTS_DIR, { recursive: true });
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  const url = await startServer();
  if (process.env.E2E_DEBUG) {
    process.stdout.write(`[e2e] server up at ${url}\n`);
  }
});

AfterAll(async function () {
  await stopServer();
});

Before({ timeout: 30_000 }, async function () {
  await this.openContext();
  await this.clearAllStorage();
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && this.page) {
    try {
      const name = scenario.pickle.name.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
      const file = join(SCREENSHOTS_DIR, `${name}.png`);
      await this.page.screenshot({ path: file, fullPage: true });
      if (process.env.E2E_DEBUG) {
        process.stdout.write(`[e2e] screenshot saved: ${file}\n`);
      }
    } catch {
      /* ignore screenshot failures */
    }
  }
  await this.closeContext();
});
