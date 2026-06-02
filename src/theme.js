// Theme application: writes data-theme + data-accent to <html> and listens
// to system color-scheme changes when the user picks "system".

const VALID_THEMES = new Set(['light', 'dark', 'system']);
const VALID_ACCENTS = new Set(['pink', 'purple', 'green', 'blue', 'orange']);

let _systemListener = null;

function resolveTheme(theme) {
  if (theme === 'system') {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

function _apply(theme, accent) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const safeAccent = VALID_ACCENTS.has(accent) ? accent : 'pink';
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-accent', safeAccent);
  root.style.colorScheme = resolved;
  // Sync the browser chrome (mobile address bar, PWA bar) to the active
  // accent. getComputedStyle forces a re-evaluation so --primary reflects
  // the just-set data-accent.
  try {
    const primary = getComputedStyle(root).getPropertyValue('--primary').trim();
    if (primary) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', primary);
    }
  } catch {}
  // Persist a small sync hint for the pre-paint script in index.html.
  try {
    localStorage.setItem('srs-kids-theme', JSON.stringify({ theme, accent: safeAccent }));
  } catch {}
}

function watchSystemTheme(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(mql.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/**
 * Apply the theme + accent immediately and (if theme === 'system') keep
 * watching OS preference changes so the UI follows.
 *
 * @returns a cleanup function that disconnects the system listener.
 */
export function applyTheme(theme, accent) {
  // Tear down any previous system listener first.
  if (_systemListener) {
    _systemListener();
    _systemListener = null;
  }
  const t = VALID_THEMES.has(theme) ? theme : 'light';
  _apply(t, accent);
  if (t === 'system') {
    _systemListener = watchSystemTheme(() => _apply('system', accent));
  }
  return () => {
    if (_systemListener) {
      _systemListener();
      _systemListener = null;
    }
  };
}

/**
 * One-shot resolver for components that need to know the current effective
 * theme (e.g. for chart colors). Returns 'light' or 'dark'.
 */
export function getResolvedTheme(theme) {
  return resolveTheme(theme);
}

/**
 * Read a CSS custom property from the root element. Useful for chart code
 * that needs concrete color strings (canvas doesn't resolve var() itself).
 */
export function cssVar(name) {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
