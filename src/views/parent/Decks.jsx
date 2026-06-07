import { useEffect, useRef, useState } from 'preact/hooks';
import {
  listDecks,
  createDeck,
  deleteDeck,
  archiveDeck,
  updateDeck,
  replaceCards,
  validateDeckJson,
  exportDeckAsJson,
  countDue
} from '../../db/decks.js';
import { listDecks as listAllDecks } from '../../db/decks.js'; // (used in AddDeckModal for duplicate-name check)
import { Modal } from '../../components/Modal.jsx';
import { showToast } from '../../components/toast.js';
import { getVoices, getVoicesForLanguage } from '../../speech/index.js';
import { STRINGS } from '../../i18n.js';
import { GitHubModal } from './GitHubModal.jsx';

export function Decks({ profile, setProfile }) {
  const [decks, setDecks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showGitHub, setShowGitHub] = useState(false);
  const [dueMap, setDueMap] = useState({});
  const [allTags, setAllTags] = useState([]);

  async function refresh() {
    const all = await listDecks(true);
    setDecks(all);
    const counts = {};
    for (const d of all) counts[d.id] = await countDue(d.id);
    setDueMap(counts);
    const tags = new Set();
    for (const d of all) for (const t of d.tags || []) tags.add(t);
    setAllTags([...tags].sort());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = decks.filter((d) => {
    if (statusFilter === 'active') return d.status === 'active';
    if (statusFilter === 'archived') return d.status === 'archived';
    return true;
  });

  return (
    <div>
      <div class="section__head">
        <h2 class="section__title">{STRINGS.parent.decks.title}</h2>
        <div class="add-deck-dropdown">
          <button class="btn" onClick={() => setAdding(true)}>
            + {STRINGS.parent.decks.addButton}
          </button>
          <button class="btn btn--secondary" onClick={() => setShowGitHub(true)}>
            ⭐ GitHub
          </button>
        </div>
      </div>

      <div class="row" style={{ marginBottom: '12px' }}>
        <div class="range-pills">
          {['all', 'active', 'archived'].map((s) => (
            <button
              key={s}
              class={`range-pills__btn ${statusFilter === s ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {STRINGS.parent.decks.filters[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div class="section">
          <div class="empty">
            <div class="emoji">📚</div>
            <p>{STRINGS.parent.decks.empty}</p>
          </div>
        </div>
      ) : (
        <div class="metrics-grid">
          {filtered.map((d) => (
            <DeckAdminCard
              key={d.id}
              deck={d}
              due={dueMap[d.id]?.due || 0}
              onEdit={() => setEditing(d)}
              onDelete={() => setDeleting(d)}
              onArchive={async () => {
                await archiveDeck(d.id, d.status !== 'archived');
                await refresh();
              }}
              onReplace={() => setReplacing(d)}
              onDownload={() => downloadDeck(d)}
            />
          ))}
        </div>
      )}

      {adding && (
        <AddDeckModal
          onClose={() => setAdding(false)}
          onCreated={async () => {
            setAdding(false);
            await refresh();
          }}
        />
      )}

      <GitHubModal
        open={showGitHub}
        onClose={() => setShowGitHub(false)}
        deckRepos={profile?.settings?.deckRepos || []}
        setProfile={setProfile}
        onImport={async () => {
          await refresh();
        }}
      />

      {editing && (
        <EditDeckModal
          deck={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteDeckModal
          deck={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            await refresh();
          }}
        />
      )}
      {replacing && (
        <ReplaceCardsModal
          deck={replacing}
          onClose={() => setReplacing(null)}
          onReplaced={async () => {
            setReplacing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function DeckAdminCard({ deck, due, onEdit, onDelete, onArchive, onReplace, onDownload }) {
  const isArchived = deck.status === 'archived';
  return (
    <div class={`deck-card-admin ${isArchived ? 'deck-card-admin--archived' : ''}`}>
      <div class="deck-card-admin__head">
        <div>
          <div class="deck-card-admin__name">
            {deck.name} {isArchived && <span class="chip">archived</span>}
          </div>
          <div class="deck-card-admin__meta">
            {deck.language} • {deck.cards.length} cards
            {due > 0 && (
              <>
                {' '}
                • <span class="chip chip--accent">{due} due</span>
              </>
            )}
          </div>
          {deck.tags?.length > 0 && (
            <div class="row row--tight" style={{ marginTop: '6px' }}>
              {deck.tags.map((t) => (
                <span key={t} class="chip chip--secondary">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div class="deck-card-admin__actions">
        <button class="btn btn--small" onClick={onEdit}>
          {STRINGS.parent.decks.actions.edit}
        </button>
        <button class="btn btn--small btn--ghost" onClick={onDownload}>
          {STRINGS.parent.decks.actions.download}
        </button>
        <button class="btn btn--small btn--ghost" onClick={onArchive}>
          {isArchived
            ? STRINGS.parent.decks.actions.unarchive
            : STRINGS.parent.decks.actions.archive}
        </button>
        <button class="btn btn--small btn--ghost" onClick={onReplace}>
          {STRINGS.parent.decks.actions.replace}
        </button>
        <button class="btn btn--small btn--orange" onClick={onDelete}>
          {STRINGS.parent.decks.actions.delete}
        </button>
      </div>
    </div>
  );
}

function downloadDeck(deck) {
  const json = exportDeckAsJson(deck);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.deck.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AddDeckModal({ onClose, onCreated }) {
  const [filename, setFilename] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [err, setErr] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    setErr(null);
    setWarnings([]);
    setFilename(file.name);
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const { deck, warnings } = validateDeckJson(raw);
      setParsed(deck);
      setWarnings(warnings);
    } catch (e) {
      setErr(e.message || 'Could not read file.');
      setParsed(null);
    }
  }

  async function submit() {
    if (!parsed) return;
    setBusy(true);
    try {
      // Check for duplicate names among active+archived decks.
      const all = await listAllDecks(true);
      if (all.some((d) => d.name.trim().toLowerCase() === parsed.name.trim().toLowerCase())) {
        setErr(STRINGS.parent.decks.create.errors.duplicate);
        setBusy(false);
        return;
      }
      await createDeck(parsed);
      if (warnings.length)
        showToast(`${warnings.length} warning(s) — check deck`, { variant: 'warn' });
      onCreated && onCreated();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={STRINGS.parent.decks.create.title}>
      <div
        class="dropzone"
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('is-dragover');
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('is-dragover')}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('is-dragover');
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <div style={{ fontSize: '2.4rem' }}>📥</div>
        <div class="bold">{filename || STRINGS.parent.decks.create.drop}</div>
        <div class="dropzone__hint">{STRINGS.parent.decks.create.dropHint}</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            if (e.currentTarget.files[0]) handleFile(e.currentTarget.files[0]);
          }}
        />
      </div>
      {err && <div class="alert alert--error">{err}</div>}
      {warnings.length > 0 && (
        <div class="alert alert--warn">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
      {parsed && (
        <div class="alert alert--success">
          <div class="bold">{parsed.name}</div>
          <div>
            {parsed.cards.length} cards • {parsed.tags.length} tags • {parsed.language}
          </div>
        </div>
      )}
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
        <button class="btn btn--ghost" onClick={onClose}>
          {STRINGS.parent.decks.create.cancel}
        </button>
        <button class="btn" onClick={submit} disabled={!parsed || busy}>
          {STRINGS.parent.decks.create.submit}
        </button>
      </div>
    </Modal>
  );
}

function DeleteDeckModal({ deck, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={STRINGS.parent.decks.delete.title}>
      <p>{STRINGS.parent.decks.delete.body}</p>
      <p class="text-soft">
        <strong>{deck.name}</strong> — {deck.cards.length} cards
      </p>
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
        <button class="btn btn--ghost" onClick={onClose}>
          {STRINGS.parent.decks.delete.no}
        </button>
        <button
          class="btn btn--orange"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await deleteDeck(deck.id);
              onDeleted && onDeleted();
            } finally {
              setBusy(false);
            }
          }}
        >
          {STRINGS.parent.decks.delete.yes}
        </button>
      </div>
    </Modal>
  );
}

function ReplaceCardsModal({ deck, onClose, onReplaced }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(f) {
    setErr(null);
    setFile(f);
    try {
      const text = await f.text();
      const raw = JSON.parse(text);
      const { deck: next } = validateDeckJson(raw);
      const oldIds = new Set(deck.cards.map((c) => c.id));
      const newIds = new Set(next.cards.map((c) => c.id));
      const added = [...newIds].filter((id) => !oldIds.has(id));
      const removed = [...oldIds].filter((id) => !newIds.has(id));
      const unchanged = [...oldIds].filter((id) => newIds.has(id));
      setParsed(next);
      setSummary({ added: added.length, removed: removed.length, unchanged: unchanged.length });
    } catch (e) {
      setErr(e.message);
      setParsed(null);
      setSummary(null);
    }
  }

  return (
    <Modal open onClose={onClose} title={STRINGS.parent.decks.replace.title}>
      <p class="text-soft">
        {deck.name} — current: {deck.cards.length} cards
      </p>
      <div
        class="dropzone"
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <div class="bold">{file ? file.name : 'Drop replacement JSON here'}</div>
        <div class="dropzone__hint">
          Unchanged cards keep their progress; new cards start fresh, removed cards are dropped.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            if (e.currentTarget.files[0]) handleFile(e.currentTarget.files[0]);
          }}
        />
      </div>
      {err && <div class="alert alert--error">{err}</div>}
      {summary && <div class="alert alert--info">{STRINGS.parent.decks.replace.body(summary)}</div>}
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
        <button class="btn btn--ghost" onClick={onClose}>
          {STRINGS.parent.decks.replace.no}
        </button>
        <button
          class="btn btn--orange"
          disabled={!parsed || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await replaceCards(deck.id, parsed.cards);
              onReplaced && onReplaced();
            } finally {
              setBusy(false);
            }
          }}
        >
          {STRINGS.parent.decks.replace.yes}
        </button>
      </div>
    </Modal>
  );
}

function EditDeckModal({ deck, onClose, onSaved }) {
  const [name, setName] = useState(deck.name);
  const [language, setLanguage] = useState(deck.language);
  const [tags, setTags] = useState((deck.tags || []).join(', '));
  const [voiceURI, setVoiceURI] = useState(deck.voiceURI || '');
  const [voices, setVoices] = useState([]);
  const [sessionSize, setSessionSize] = useState(
    deck.sessionSize || { spelling: null, phrase: null, fact: null, audio: null }
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await getVoicesForLanguage(language);
      setVoices(v);
    })();
  }, [language]);

  async function save() {
    setBusy(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const ss = {
        spelling: sessionSize.spelling === '' ? null : Number(sessionSize.spelling),
        phrase: sessionSize.phrase === '' ? null : Number(sessionSize.phrase),
        fact: sessionSize.fact === '' ? null : Number(sessionSize.fact),
        audio: sessionSize.audio === '' ? null : Number(sessionSize.audio)
      };
      const allNull = [ss.spelling, ss.phrase, ss.fact, ss.audio].every(
        (v) => v === null || Number.isNaN(v)
      );
      await updateDeck(deck.id, {
        name: name.trim(),
        language,
        tags: tagList,
        voiceURI,
        sessionSize: allNull ? null : ss
      });
      onSaved && onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={STRINGS.parent.decks.edit.title}>
      <div class="form-row">
        <label class="label">{STRINGS.parent.decks.edit.name}</label>
        <input class="input" value={name} onInput={(e) => setName(e.currentTarget.value)} />
      </div>
      <div class="form-row">
        <label class="label">{STRINGS.parent.decks.edit.language}</label>
        <input class="input" value={language} onInput={(e) => setLanguage(e.currentTarget.value)} />
      </div>
      <div class="form-row">
        <label class="label">{STRINGS.parent.decks.edit.tags}</label>
        <input class="input" value={tags} onInput={(e) => setTags(e.currentTarget.value)} />
      </div>
      <div class="form-row">
        <label class="label">{STRINGS.parent.decks.edit.voice}</label>
        <select
          class="select"
          value={voiceURI}
          onChange={(e) => setVoiceURI(e.currentTarget.value)}
        >
          <option value="">{STRINGS.parent.decks.edit.voice} (auto)</option>
          {voices.length === 0 && <option value="">{STRINGS.parent.decks.edit.noVoice}</option>}
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
      <div class="form-row">
        <label class="label">{STRINGS.parent.decks.edit.sessionSize}</label>
        <div class="row row--tight" style={{ flexWrap: 'wrap' }}>
          {['spelling', 'phrase', 'fact', 'audio'].map((t) => (
            <div key={t} style={{ flex: '1 1 90px' }}>
              <label class="label" style={{ fontSize: '0.8rem' }}>
                {t}
              </label>
              <input
                class="input"
                type="number"
                min="0"
                max="20"
                placeholder="default"
                value={sessionSize[t] === null ? '' : sessionSize[t]}
                onInput={(e) => setSessionSize({ ...sessionSize, [t]: e.currentTarget.value })}
              />
            </div>
          ))}
        </div>
      </div>
      <div class="row" style={{ justifyContent: 'flex-end' }}>
        <button class="btn btn--ghost" onClick={onClose}>
          {STRINGS.parent.decks.edit.cancel}
        </button>
        <button class="btn" disabled={busy} onClick={save}>
          {STRINGS.parent.decks.edit.save}
        </button>
      </div>
    </Modal>
  );
}
