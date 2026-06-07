import { getDb, metaGet, metaSet } from './index.js';
import { uuid } from '../utils/index.js';

const PROFILE_KEY = 'current';

export const DEFAULT_SETTINGS = {
  keyboardLayout: 'qwerty',
  sessionSize: { spelling: 4, phrase: 3, fact: 2, audio: 3 },
  sessionTimeLimit: 0,
  audioAutoPlay: true,
  audioReplayButton: true,
  theme: 'light', // 'light' | 'dark' | 'system'
  accent: 'pink', // 'pink' | 'purple' | 'green' | 'blue' | 'orange'
  timedSession: {
    enabled: false,
    availableTimers: [5, 10, 15],
    defaultTimer: null
  },
  deckRepos: []
};

function parseOfficialDeckRepo(envValue) {
  if (!envValue) return null;
  const m = envValue.match(/^([^/]+)\/([^/:]+)(?::(.+))?$/);
  if (!m) return null;
  return {
    name: 'Official Decks',
    repo: `${m[1]}/${m[2]}`,
    path: m[3] || '',
    isDefault: true
  };
}

export async function getCurrentProfile() {
  const profile = await metaGet(PROFILE_KEY, null);
  if (profile) return profile;

  // Create a default profile.
  const settings = {
    ...DEFAULT_SETTINGS,
    sessionSize: { ...DEFAULT_SETTINGS.sessionSize },
    timedSession: { ...DEFAULT_SETTINGS.timedSession }
  };

  // Auto-add official repo from env var on first boot if set and no repos yet
  const envRepo = parseOfficialDeckRepo(import.meta.env.VITE_OFFICIAL_DECK_REPO);
  if (envRepo) {
    settings.deckRepos = [envRepo];
  }

  const fresh = {
    id: PROFILE_KEY,
    name: 'Friend',
    createdAt: Date.now(),
    settings
  };
  await metaSet(PROFILE_KEY, fresh);
  return fresh;
}

export async function updateProfile(patch) {
  const current = await getCurrentProfile();
  const next = { ...current, ...patch };
  await metaSet(PROFILE_KEY, next);
  return next;
}

export async function updateSettings(patch) {
  const profile = await getCurrentProfile();
  const next = {
    ...profile,
    settings: {
      ...profile.settings,
      ...patch,
      sessionSize: { ...profile.settings.sessionSize, ...(patch.sessionSize || {}) },
      timedSession: { ...profile.settings.timedSession, ...(patch.timedSession || {}) },
      deckRepos:
        patch.deckRepos !== undefined ? patch.deckRepos : profile.settings.deckRepos || []
    }
  };
  await metaSet(PROFILE_KEY, next);
  return next;
}

export async function addDeckRepo(repo) {
  const profile = await getCurrentProfile();
  const repos = profile.settings.deckRepos || [];
  // If this is the first repo, make it default
  const withNew = [...repos, { ...repo, id: uuid(), isDefault: repos.length === 0 ? true : !!repo.isDefault }];
  return updateSettings({ deckRepos: withNew });
}

export async function updateDeckRepo(id, patch) {
  const profile = await getCurrentProfile();
  const repos = profile.settings.deckRepos || [];
  const withNew = repos.map((r) => (r.id === id ? { ...r, ...patch } : r));
  return updateSettings({ deckRepos: withNew });
}

export async function removeDeckRepo(id) {
  const profile = await getCurrentProfile();
  let repos = (profile.settings.deckRepos || []).filter((r) => r.id !== id);
  // If we removed the default, make the first remaining repo the default
  const hadDefault = repos.some((r) => r.isDefault);
  if (!hadDefault && repos.length > 0) {
    repos = repos.map((r, i) => (i === 0 ? { ...r, isDefault: true } : r));
  }
  return updateSettings({ deckRepos: repos });
}

export async function setDefaultDeckRepo(id) {
  const profile = await getCurrentProfile();
  const repos = (profile.settings.deckRepos || []).map((r) => ({
    ...r,
    isDefault: r.id === id
  }));
  return updateSettings({ deckRepos: repos });
}
