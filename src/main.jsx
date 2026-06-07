import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import './styles/base.css';
import './styles/kid.css';
import './styles/parent.css';

import { isDbUnavailable, getDb } from './db/index.js';
import { getCurrentProfile } from './db/profiles.js';
import { reapOldIncompleteSessions } from './db/sessions.js';
import { loadDefaultDecks } from './db/decks.js';
import { getVoices, onVoicesChanged } from './speech/index.js';
import { applyTheme } from './theme.js';
import { exposeE2EHelpers } from './e2e-helpers.js';

import { useRoute, useNavigate } from './router.js';
import { ToastHost } from './components/ToastHost.jsx';
import { Home } from './views/kid/Home.jsx';
import { Session } from './views/kid/Session.jsx';
import { Gate } from './views/parent/Gate.jsx';
import { Dashboard } from './views/parent/Dashboard.jsx';
import { Decks } from './views/parent/Decks.jsx';
import { Settings } from './views/parent/Settings.jsx';
import { STRINGS } from './i18n.js';

function App() {
  const [bootError, setBootError] = useState(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const route = useRoute();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDb();
        await reapOldIncompleteSessions();
        await loadDefaultDecks();
        const p = await getCurrentProfile();
        if (!cancelled) {
          setProfile(p);
          setReady(true);
          exposeE2EHelpers();
          if (import.meta.env.VITE_E2E_BUILD === 'true') {
            // Set in both storage areas so the Gate check in ParentRoute
            // survives clearAllStorage (which clears sessionStorage but
            // preserves localStorage) and survives the setDeckRepos reload.
            sessionStorage.setItem('parent-authed', '1');
            localStorage.setItem('parent-authed', '1');
          }
        }
      } catch (e) {
        if (!cancelled) setBootError(e.message || String(e));
      }
    })();
    // Pre-warm voices.
    getVoices().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply theme + accent whenever the profile changes (covers boot and
  // settings updates).
  useEffect(() => {
    if (!profile) return;
    const cleanup = applyTheme(profile.settings.theme, profile.settings.accent);
    return cleanup;
  }, [profile]);

  if (bootError || isDbUnavailable()) {
    return <BootError message={STRINGS.kid.errors.storageUnavailable} detail={bootError} />;
  }
  if (!ready || !profile) {
    return <BootSplash />;
  }

  const path = route.path || '/';
  return (
    <div class="app-shell">
      <RouteSwitch
        path={path}
        params={route.params}
        profile={profile}
        setProfile={setProfile}
        navigate={navigate}
      />
      <ToastHost />
    </div>
  );
}

function RouteSwitch({ path, params, profile, setProfile, navigate }) {
  // Normalize trailing slash
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  if (p === '/' || p === '/kid' || p === '') {
    return <Home profile={profile} navigate={navigate} />;
  }
  if (p === '/session') {
    const timerMinutes = params.timer ? parseInt(params.timer, 10) : null;
    return (
      <Session
        deckId={params.deck}
        timerMinutes={timerMinutes}
        profile={profile}
        setProfile={setProfile}
        navigate={navigate}
      />
    );
  }
  if (p === '/parent' || p.startsWith('/parent/')) {
    return (
      <ParentRoute
        tab={params.tab || 'overview'}
        profile={profile}
        setProfile={setProfile}
        navigate={navigate}
      />
    );
  }
  // Fallback: kid home
  return <Home profile={profile} navigate={navigate} />;
}

function ParentRoute({ tab, profile, setProfile, navigate }) {
  const isAuthed = () =>
    sessionStorage.getItem('parent-authed') === '1' ||
    localStorage.getItem('parent-authed') === '1';
  const [authed, setAuthed] = useState(isAuthed);
  if (!authed) {
    return (
      <Gate
        onSuccess={() => {
          sessionStorage.setItem('parent-authed', '1');
          localStorage.setItem('parent-authed', '1');
          setAuthed(true);
        }}
        onCancel={() => navigate('/')}
      />
    );
  }
  const activeTab = tab || 'overview';
  let content;
  if (activeTab === 'decks') content = <Decks profile={profile} setProfile={setProfile} />;
  else if (activeTab === 'settings')
    content = <Settings profile={profile} setProfile={setProfile} />;
  else content = <Dashboard />;

  return (
    <div class="parent-view">
      <header class="parent-header">
        <div class="parent-header__brand">
          <div class="parent-header__logo">🌟</div>
          <h1>
            {STRINGS.app.name} — Parent{' '}
            <span
              style={{
                fontSize: '0.5em',
                fontWeight: 'normal',
                opacity: 0.45,
                letterSpacing: '0.04em'
              }}
            >
              ({import.meta.env.VITE_GIT_SHA})
            </span>
          </h1>
        </div>
        <button
          class="btn btn--ghost btn--small"
          onClick={() => {
            sessionStorage.removeItem('parent-authed');
            navigate('/');
          }}
        >
          {STRINGS.parent.nav.exit}
        </button>
      </header>
      <nav class="parent-nav" aria-label="parent sections">
        <button
          class={`parent-nav__btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => navigate('/parent/overview')}
        >
          {STRINGS.parent.nav.overview}
        </button>
        <button
          class={`parent-nav__btn ${activeTab === 'decks' ? 'is-active' : ''}`}
          onClick={() => navigate('/parent/decks')}
        >
          {STRINGS.parent.nav.decks}
        </button>
        <button
          class={`parent-nav__btn ${activeTab === 'settings' ? 'is-active' : ''}`}
          onClick={() => navigate('/parent/settings')}
        >
          {STRINGS.parent.nav.settings}
        </button>
        <button class="parent-nav__btn" onClick={() => navigate('/')}>
          ← {STRINGS.parent.nav.home}
        </button>
      </nav>
      <main class="parent-main">{content}</main>
    </div>
  );
}

function BootSplash() {
  return (
    <div class="screen center" style={{ flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '4rem' }}>🌟</div>
      <div class="text-soft">Loading…</div>
      <div
        class="text-soft"
        style={{ fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.05em' }}
      >
        {import.meta.env.VITE_GIT_SHA}
      </div>
    </div>
  );
}

function BootError({ message, detail }) {
  return (
    <div class="screen center" style={{ padding: '24px' }}>
      <div class="card-surface" style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem' }}>😢</div>
        <h2 style={{ margin: '12px 0' }}>{message}</h2>
        {detail && (
          <p class="text-soft" style={{ fontSize: '0.9rem' }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

// Register service worker (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('workbox-window')
      .then(({ Workbox }) => {
        const wb = new Workbox('/sw.js');
        wb.register().catch(() => {});
      })
      .catch(() => {});
  });
}

render(<App />, document.getElementById('app'));
