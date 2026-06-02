import { describe, it, expect } from 'vitest';
import { STRINGS } from './i18n.js';

describe('STRINGS.parent.decks.replace.body', () => {
  it('describes SRS state preservation accurately', () => {
    const body = STRINGS.parent.decks.replace.body({ added: 3, removed: 1, unchanged: 7 });
    expect(body).toBe(
      '3 new, 1 removed, 7 unchanged. Unchanged cards keep their progress; new cards start fresh.'
    );
  });

  it('no longer claims progress is reset for changed cards', () => {
    const body = STRINGS.parent.decks.replace.body({ added: 1, removed: 1, unchanged: 1 });
    expect(body).not.toMatch(/reset/i);
  });
});

describe('STRINGS.app', () => {
  it('has a name and tagline', () => {
    expect(STRINGS.app.name).toBeTruthy();
    expect(STRINGS.app.tagline).toBeTruthy();
  });
});
