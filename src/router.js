// Lightweight hash-based router for Preact.
//
// Supports both path segments (`/parent/decks`) and query strings (`/session?deck=abc`).
// Path segments are exposed as `segments`; the first interesting ones are also
// copied into `params` for convenience (`/parent/:tab` → `params.tab`).

import { useEffect, useState, useCallback } from 'preact/hooks';

const listeners = new Set();

function readHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathAndQuery = '/', queryStr = ''] = raw.split('?');
  const segments = pathAndQuery.split('/').filter(Boolean);
  const pathParams = {};
  if (segments[0] === 'parent' && segments[1]) {
    pathParams.tab = segments[1];
  }
  const queryParams = Object.fromEntries(new URLSearchParams(queryStr));
  return {
    path: '/' + segments.join('/'),
    segments,
    params: { ...pathParams, ...queryParams }
  };
}

function notify() {
  const route = readHash();
  for (const l of listeners) l(route);
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', notify);
}

export function navigate(path) {
  if (!path.startsWith('/')) path = '/' + path;
  const next = '#' + path;
  if (window.location.hash === next) {
    // Setting location.hash to the same value won't fire hashchange — call
    // listeners directly so the view re-renders.
    // Always notify to ensure the component re-renders when explicitly navigating
    // to the current path (e.g., clicking the same nav tab multiple times).
    notify();
  } else {
    window.location.hash = path;
  }
}

export function useRoute() {
  const [route, setRoute] = useState(readHash());
  useEffect(() => {
    const l = (r) => setRoute({ ...r });
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return route;
}

export function useNavigate() {
  return useCallback((path) => navigate(path), []);
}
