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
  accent: 'pink' // 'pink' | 'purple' | 'green' | 'blue' | 'orange'
};

export async function getCurrentProfile() {
  const profile = await metaGet(PROFILE_KEY, null);
  if (profile) return profile;
  // Create a default profile.
  const fresh = {
    id: PROFILE_KEY,
    name: 'Friend',
    createdAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, sessionSize: { ...DEFAULT_SETTINGS.sessionSize } }
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
      sessionSize: { ...profile.settings.sessionSize, ...(patch.sessionSize || {}) }
    }
  };
  await metaSet(PROFILE_KEY, next);
  return next;
}
