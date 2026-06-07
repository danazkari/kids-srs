import { metaGet, metaSet } from './db/index.js';

export function exposeE2EHelpers() {
  if (typeof window === 'undefined') return;

  window.__e2e = {
    async setDeckRepos(repos) {
      const profile = await metaGet('current');
      if (profile) {
        profile.settings = { ...profile.settings, deckRepos: repos };
        await metaSet('current', profile);
      }
    },

    async getDeckRepos() {
      const profile = await metaGet('current');
      return profile?.settings?.deckRepos || [];
    },

    async reload() {
      window.location.reload();
    }
  };
}