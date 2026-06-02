// scripts/gen-icons.mjs
// Optional: regenerates the icon set. Currently a no-op (icons are SVG).
// To regenerate PNGs from the SVG sources, install `sharp` and use it here.

import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'public', 'icons');

if (!existsSync(iconsDir)) {
  console.error('No icons directory found.');
  process.exit(1);
}

const files = readdirSync(iconsDir);
console.log('Existing icons:');
for (const f of files) console.log(' -', f);
console.log('\nTo produce PNGs, add a `sharp`-based converter here.');
