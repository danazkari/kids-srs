import { describe, it, expect } from 'vitest';
import { ACCENT_COLORS, DEFAULT_ACCENT } from './theme-colors.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parses the inline `ACCENT_COLORS = { ... }` block out of the pre-paint
 * script in `index.html`. The pre-paint has to be a synchronous inline
 * `<script>` (a module script is async, and we need to set data-theme
 * before first paint), so it carries its own copy of the color map.
 * This test catches drift between the two.
 */
function extractInlineAccentColors(html) {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  const body = scriptMatch[1];
  const m = body.match(/ACCENT_COLORS\s*=\s*\{([\s\S]*?)\}/);
  if (!m) return null;
  const obj = m[1];
  // Keys may be quoted or bare; values are always '#xxxxxx'.
  const entries = [...obj.matchAll(/(?:'([\w-]+)'|([\w-]+))\s*:\s*'(#[0-9a-fA-F]{3,8})'/g)];
  const out = {};
  for (const e of entries) out[e[1] || e[2]] = e[3];
  return out;
}

describe('accent color map', () => {
  it('JS export matches the inline pre-paint block in index.html', () => {
    const html = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf8');
    const inline = extractInlineAccentColors(html);
    expect(inline).not.toBeNull();
    expect(inline).toEqual(ACCENT_COLORS);
  });

  it('JS export has all 5 expected accent keys', () => {
    expect(Object.keys(ACCENT_COLORS).sort()).toEqual(
      ['blue', 'green', 'orange', 'pink', 'purple']
    );
  });

  it('every value is a 7-char hex color starting with #', () => {
    for (const v of Object.values(ACCENT_COLORS)) {
      expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('DEFAULT_ACCENT is one of the keys', () => {
    expect(Object.keys(ACCENT_COLORS)).toContain(DEFAULT_ACCENT);
  });
});
