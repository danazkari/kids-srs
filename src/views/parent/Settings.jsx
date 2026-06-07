import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS, updateSettings, updateProfile } from '../../db/profiles.js';
import { listDecks, updateDeck } from '../../db/decks.js';
import { getVoices, getVoicesForLanguage } from '../../speech/index.js';
import { applyTheme } from '../../theme.js';
import { showToast } from '../../components/toast.js';
import { STRINGS } from '../../i18n.js';

const ACCENTS = [
  { id: 'pink', color: '#ff85c1' },
  { id: 'purple', color: '#b388ff' },
  { id: 'green', color: '#6dd97b' },
  { id: 'blue', color: '#85d4ff' },
  { id: 'orange', color: '#ff8c42' }
];

const THEMES = [
  { id: 'light', icon: '☀️' },
  { id: 'dark', icon: '🌙' },
  { id: 'system', icon: '🖥️' }
];

export function Settings({ profile, setProfile }) {
  const [draft, setDraft] = useState(null);
  const [decks, setDecks] = useState([]);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (profile) {
      setDraft(structuredClone(profile));
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      const all = await listDecks(true);
      setDecks(all);
      const v = await getVoices();
      setVoices(v);
    })();
  }, []);

  if (!draft) {
    return (
      <div class="section">
        <div class="empty">
          <div class="emoji">⏳</div>
        </div>
      </div>
    );
  }

  function patch(p) {
    setDraft((d) => ({ ...d, ...p }));
  }
  function patchSettings(p) {
    setDraft((d) => ({
      ...d,
      settings: {
        ...d.settings,
        ...p,
        sessionSize: { ...d.settings.sessionSize, ...(p.sessionSize || {}) }
      }
    }));
  }

  // Theme + accent get saved immediately so the live preview is also
  // persisted (no risk of losing the choice by navigating away).
  function setTheme(theme) {
    const currentAccent = draft.settings.accent;
    patchSettings({ theme });
    updateSettings({ theme }).then((next) => {
      setProfile(next);
      applyTheme(theme, currentAccent);
    });
  }
  function setAccent(accent) {
    const currentTheme = draft.settings.theme;
    patchSettings({ accent });
    updateSettings({ accent }).then((next) => {
      setProfile(next);
      applyTheme(currentTheme, accent);
    });
  }

  async function save() {
    const next = await updateProfile({ name: draft.name });
    const next2 = await updateSettings(draft.settings);
    setProfile(next2);
    showToast(STRINGS.parent.settings.saved, { variant: 'success' });
  }

  async function setDeckVoice(deckId, voiceURI) {
    await updateDeck(deckId, { voiceURI });
    setDecks((prev) => prev.map((d) => (d.id === deckId ? { ...d, voiceURI } : d)));
  }

  return (
    <div>
      <h2 class="section__title" style={{ marginBottom: '12px' }}>
        {STRINGS.parent.settings.title}
      </h2>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.profile.title}
        </h3>
        <div class="form-row">
          <label class="label">{STRINGS.parent.settings.profile.name}</label>
          <input
            class="input"
            value={draft.name}
            onInput={(e) => patch({ name: e.currentTarget.value })}
          />
        </div>
      </div>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.appearance.title}
        </h3>

        <div class="form-row">
          <label class="label">{STRINGS.parent.settings.appearance.themeHeading}</label>
          <div
            class="theme-pills"
            role="radiogroup"
            aria-label={STRINGS.parent.settings.appearance.themeHeading}
          >
            {THEMES.map((t) => {
              const active = draft.settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  class={`theme-pill ${active ? 'is-active' : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  <span class="theme-pill__icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span>
                    {
                      STRINGS.parent.settings.appearance[
                        'theme' + t.id[0].toUpperCase() + t.id.slice(1)
                      ]
                    }
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div class="form-row">
          <label class="label">{STRINGS.parent.settings.appearance.accentHeading}</label>
          <div
            class="accent-swatches"
            role="radiogroup"
            aria-label={STRINGS.parent.settings.appearance.accentHeading}
          >
            {ACCENTS.map((a) => {
              const active = draft.settings.accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  class={`swatch ${active ? 'is-active' : ''}`}
                  style={{ background: a.color }}
                  title={STRINGS.parent.settings.appearance.accentNames[a.id]}
                  onClick={() => setAccent(a.id)}
                >
                  <span class="sr-only">
                    {STRINGS.parent.settings.appearance.accentNames[a.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.keyboard.title}
        </h3>
        <div class="row">
          <label class="radio-row" style={{ flex: 1 }}>
            <input
              type="radio"
              name="kbd"
              checked={draft.settings.keyboardLayout === 'qwerty'}
              onChange={() => patchSettings({ keyboardLayout: 'qwerty' })}
            />
            <label>{STRINGS.parent.settings.keyboard.qwerty}</label>
          </label>
          <label class="radio-row" style={{ flex: 1 }}>
            <input
              type="radio"
              name="kbd"
              checked={draft.settings.keyboardLayout === 'abc'}
              onChange={() => patchSettings({ keyboardLayout: 'abc' })}
            />
            <label>{STRINGS.parent.settings.keyboard.abc}</label>
          </label>
        </div>
      </div>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.session.title}
        </h3>
        {['spelling', 'phrase', 'fact', 'audio'].map((t) => (
          <div class="form-row" key={t}>
            <label class="label">{STRINGS.parent.settings.session[t]}</label>
            <input
              class="input"
              type="number"
              min="0"
              max="20"
              value={draft.settings.sessionSize[t] ?? 0}
              onInput={(e) =>
                patchSettings({ sessionSize: { [t]: Number(e.currentTarget.value) } })
              }
            />
          </div>
        ))}
        <div class="form-row">
          <label class="label">Time limit (minutes, 0 = none)</label>
          <input
            class="input"
            type="number"
            min="0"
            max="60"
            value={draft.settings.sessionTimeLimit ?? 0}
            onInput={(e) => patchSettings({ sessionTimeLimit: Number(e.currentTarget.value) })}
          />
        </div>
      </div>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.audio.title}
        </h3>
        <label class="checkbox-row">
          <input
            type="checkbox"
            checked={draft.settings.audioAutoPlay}
            onChange={(e) => patchSettings({ audioAutoPlay: e.currentTarget.checked })}
          />
          <label>{STRINGS.parent.settings.audio.autoPlay}</label>
        </label>
        <label class="checkbox-row">
          <input
            type="checkbox"
            checked={draft.settings.audioReplayButton}
            onChange={(e) => patchSettings({ audioReplayButton: e.currentTarget.checked })}
          />
          <label>{STRINGS.parent.settings.audio.replayButton}</label>
        </label>
      </div>

      <div class="section">
        <h3 class="section__title" style={{ fontSize: '1.05rem' }}>
          {STRINGS.parent.settings.audio.voiceHeading}
        </h3>
        {decks.length === 0 && <p class="text-soft">No decks yet.</p>}
        {decks.map((d) => (
          <DeckVoiceRow key={d.id} deck={d} onChange={(v) => setDeckVoice(d.id, v)} />
        ))}
      </div>

      <div class="row" style={{ justifyContent: 'flex-end' }}>
        <button class="btn btn--lg" onClick={save}>
          {STRINGS.parent.settings.save}
        </button>
      </div>
    </div>
  );
}

function DeckVoiceRow({ deck, onChange }) {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const v = await getVoicesForLanguage(deck.language);
      if (!cancel) setVoices(v);
    })();
    return () => {
      cancel = true;
    };
  }, [deck.language]);
  return (
    <div class="form-row form-row--inline" style={{ alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div class="bold">{deck.name}</div>
        <div class="text-soft" style={{ fontSize: '0.85rem' }}>
          {deck.language}
        </div>
      </div>
      <select
        class="select"
        style={{ maxWidth: '240px', minWidth: '180px' }}
        value={deck.voiceURI || ''}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        <option value="">Auto (default)</option>
        {voices.length === 0 && <option value="">{STRINGS.parent.decks.edit.noVoice}</option>}
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );
}
