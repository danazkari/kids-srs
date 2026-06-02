// Single source of truth for the 5 accent hex values.
//
// This file is imported by `src/theme.js` at runtime. The matching
// `ACCENT_COLORS` map inside the pre-paint `<script>` in `index.html` must
// stay in sync — it has to be inline there because a module script is
// async, and the pre-paint must run before first paint. A test
// (`src/theme-colors.test.js`) reads `index.html` and asserts the two
// maps match, so drift is caught at test time.

export const ACCENT_COLORS = Object.freeze({
  pink: '#ff85c1',
  purple: '#b388ff',
  green: '#6dd97b',
  blue: '#85d4ff',
  orange: '#ff8c42'
});

export const DEFAULT_ACCENT = 'pink';
