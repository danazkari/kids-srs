// Manages the Playwright browser lifecycle. The browser is launched
// once per suite (BeforeAll) to avoid the chromium SIGSEGV that
// happens when launching repeatedly in this container.

import { chromium } from 'playwright';

let browser = null;

// chromium-headless-shell SIGSEGVs on launch in this container.
// The full chromium binary is stable when launched with --headless=new
// and the standard root-in-container mitigations.
const FULL_CHROMIUM = '/ms-playwright/chromium-1223/chrome-linux64/chrome';
const LAUNCH_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu'
];

export async function launchBrowser() {
  if (browser) return browser;
  browser = await chromium.launch({
    executablePath: FULL_CHROMIUM,
    headless: true,
    args: LAUNCH_ARGS
  });
  return browser;
}

export function getBrowser() {
  if (!browser) {
    throw new Error('Browser not launched. Did BeforeAll run?');
  }
  return browser;
}

export async function closeBrowser() {
  if (!browser) return;
  try {
    await browser.close();
  } catch {
    /* ignore */
  }
  browser = null;
}
