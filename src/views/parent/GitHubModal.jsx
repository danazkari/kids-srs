import { useState } from 'preact/hooks';
import { getDeckBySource, createDeck, updateDeck, validateDeckJson } from '../../db/decks.js';
import { addDeckRepo } from '../../db/profiles.js';
import { getCachedRepoFiles, setCachedRepoFiles } from '../../db/index.js';
import { STRINGS } from '../../i18n.js';

export function GitHubModal({ open, onClose, onImport, deckRepos = [], setProfile }) {
  const defaultRepo = deckRepos.find((r) => r.isDefault) || deckRepos[0];
  const [selectedRepoId, setSelectedRepoId] = useState(defaultRepo?.id || '');
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [repoForm, setRepoForm] = useState({ name: '', repo: '' });
  const [repoFormError, setRepoFormError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  function getRepoSource() {
    if (deckRepos.length > 0 && selectedRepoId) {
      const repo = deckRepos.find((r) => r.id === selectedRepoId);
      return repo ? { owner: repo.repo.split('/')[0], repo: repo.repo.split('/')[1], path: repo.path, repoObj: repo } : null;
    }
    if (customRepoInput.trim()) {
      const m = customRepoInput.trim().match(/^([^/]+)\/([^/:]+)(?::(.+))?$/);
      if (!m) return null;
      return { owner: m[1], repo: m[2], path: m[3] || '', repoObj: null };
    }
    return null;
  }

  async function fetchFiles() {
    const src = getRepoSource();
    if (!src) {
      setError(STRINGS.parent.decks.githubImport.errors.invalidFormat);
      return;
    }

    setFetching(true);
    setError(null);

    try {
      // Check cache first.
      const cached = await getCachedRepoFiles(src.owner, src.repo, src.path);
      if (cached) {
        setFiles(cached.filter((f) => !f.parseError));
        setFetching(false);
        return;
      }

      const url = `https://api.github.com/repos/${src.owner}/${src.repo}/contents/${src.path}`;
      const resp = await fetch(url);

      if (resp.status === 404) {
        setError(STRINGS.parent.decks.githubImport.errors.repoNotFound);
        setFetching(false);
        return;
      }

      if (resp.status === 403) {
        setError(STRINGS.parent.decks.githubImport.errors.rateLimited);
        setFetching(false);
        return;
      }

      if (!resp.ok) {
        setError(STRINGS.parent.decks.githubImport.errors.fetchFailed);
        setFetching(false);
        return;
      }

      const items = await resp.json();

      if (!Array.isArray(items)) {
        setError(STRINGS.parent.decks.githubImport.errors.fetchFailed);
        setFetching(false);
        return;
      }

      const jsonFiles = items.filter((item) => item.name.endsWith('.json') && item.type === 'file');

      if (jsonFiles.length === 0) {
        setError(STRINGS.parent.decks.githubImport.errors.noJsonFiles);
        setFetching(false);
        return;
      }

      const fileInfos = await Promise.all(
        jsonFiles.map(async (item) => {
          try {
            const fileResp = await fetch(item.download_url);
            const content = await fileResp.json();
            const { deck } = validateDeckJson(content);
            const sourceRepo = `${src.owner}/${src.repo}`;
            const sourcePath = (src.path ? src.path + '/' : '') + item.name;
            const existingDeck = await getDeckBySource(sourceRepo, sourcePath);

            return {
              name: item.name,
              downloadUrl: item.download_url,
              content: deck,
              isImported: !!existingDeck,
              existingDeck,
              sourceRepo,
              sourcePath
            };
          } catch {
            return {
              name: item.name,
              downloadUrl: item.download_url,
              content: null,
              isImported: false,
              existingDeck: null,
              sourceRepo: null,
              sourcePath: null,
              parseError: true
            };
          }
        })
      );

      const validFiles = fileInfos.filter((f) => !f.parseError);
      setFiles(validFiles);
      await setCachedRepoFiles(src.owner, src.repo, src.path, fileInfos);
    } catch (e) {
      setError(STRINGS.parent.decks.githubImport.errors.networkError);
    }

    setFetching(false);
  }

  function toggleSelect(name) {
    const next = new Set(selected);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelected(next);
  }

  async function handleReImport(fileInfo) {
    setImporting(true);
    try {
      await importDeck(fileInfo, true);
      onImport();
    } catch (e) {
      setError(e.message || 'Import failed');
    }
    setImporting(false);
  }

  async function handleImport() {
    const toImport = files.filter((f) => selected.has(f.name) && !f.isImported);
    setImporting(true);
    setError(null);
    try {
      for (const fileInfo of toImport) {
        await importDeck(fileInfo, false);
      }
      setSelected(new Set());
      onImport();
      onClose();
    } catch (e) {
      setError(e.message || 'Import failed');
    }
    setImporting(false);
  }

  async function importDeck(fileInfo, isReImport) {
    const { content, sourceRepo, sourcePath, downloadUrl } = fileInfo;

    if (isReImport) {
      let sourceCommit = null;
      try {
        const resp = await fetch(downloadUrl);
        sourceCommit = resp.headers.get('etag') || null;
      } catch { /* ignore */ }

      await updateDeck(fileInfo.existingDeck.id, {
        name: content.name,
        language: content.language,
        tags: content.tags,
        cards: content.cards,
        sourceCommit: sourceCommit,
        updatedAt: Date.now()
      });
    } else {
      let sourceCommit = null;
      try {
        const resp = await fetch(downloadUrl);
        sourceCommit = resp.headers.get('etag') || null;
      } catch { /* ignore */ }

      await createDeck({
        name: content.name,
        language: content.language,
        tags: content.tags,
        cards: content.cards,
        source: 'github',
        sourceRepo,
        sourcePath,
        sourceUrl: downloadUrl,
        sourceCommit,
        importedAt: Date.now()
      });
    }
  }

  async function handleAddRepoInModal() {
    const err = validateForm(repoForm.name, repoForm.repo);
    if (err) { setRepoFormError(err); return; }
    const m = repoForm.repo.match(/^([^/]+)\/([^/:]+)(?::(.+))?$/);
    const repo = { name: repoForm.name.trim(), repo: `${m[1]}/${m[2]}`, path: m[3] || '' };
    const next = await addDeckRepo(repo);
    setProfile(next);
    setSelectedRepoId(next.settings.deckRepos.find((r) => r.repo === repo.repo && r.path === repo.path)?.id || '');
    setShowAddRepo(false);
    setRepoForm({ name: '', repo: '' });
    setRepoFormError('');
  }

  function validateForm(name, repoStr) {
    if (!name.trim()) return STRINGS.parent.settings.deckRepos.errors.nameRequired;
    const m = repoStr.match(/^([^/]+)\/([^/:]+)(?::(.+))?$/);
    if (!m) return STRINGS.parent.settings.deckRepos.errors.repoInvalid;
    return null;
  }

  const repoSource = getRepoSource();
  const canFetch = repoSource && (deckRepos.length > 0 ? selectedRepoId : customRepoInput.trim());
  const selectedRepo = deckRepos.find((r) => r.id === selectedRepoId);
  const showDropdown = deckRepos.length > 1;
  const showSingleRepoLabel = deckRepos.length === 1 && !showAddRepo;
  const showCustomInput = deckRepos.length === 0 && !showAddRepo;

  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal github-modal">
        <div class="modal__header">
          <h2>{STRINGS.parent.decks.githubImport.title}</h2>
          <button class="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div class="modal__body">
          {deckRepos.length === 0 && !showAddRepo && (
            <div class="github-no-repos">
              <p class="text-soft">{STRINGS.parent.decks.githubImport.noRepos}</p>
              <button type="button" class="btn btn--secondary" onClick={() => setShowAddRepo(true)}>
                + {STRINGS.parent.decks.githubImport.addRepoButton}
              </button>
            </div>
          )}

          {(deckRepos.length > 0 || showAddRepo) && !showAddRepo && (
            <div class="github-repo-input">
              {showDropdown && (
                <>
                  <select
                    class="select"
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.currentTarget.value)}
                  >
                    {deckRepos.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    class="btn"
                    onClick={() => setShowAddRepo(true)}
                    title={STRINGS.parent.decks.githubImport.addRepoButton}
                  >
                    +
                  </button>
                </>
              )}
              {showSingleRepoLabel && (
                <span class="github-repo-label">
                  {STRINGS.parent.decks.githubImport.fromRepo} <strong>{selectedRepoLabel(selectedRepo)}</strong>
                </span>
              )}
              {deckRepos.length > 0 && (
                <button class="btn" onClick={fetchFiles} disabled={fetching || !canFetch}>
                  {fetching ? STRINGS.parent.decks.githubImport.fetching : STRINGS.parent.decks.githubImport.fetchFiles}
                </button>
              )}
            </div>
          )}

          {showCustomInput && (
            <div class="github-repo-input">
              <input
                type="text"
                class="input"
                placeholder={STRINGS.parent.decks.githubImport.repoPlaceholder}
                value={customRepoInput}
                onInput={(e) => setCustomRepoInput(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
              />
              <button class="btn" onClick={fetchFiles} disabled={fetching || !customRepoInput.trim()}>
                {fetching ? STRINGS.parent.decks.githubImport.fetching : STRINGS.parent.decks.githubImport.fetchFiles}
              </button>
            </div>
          )}

          {showAddRepo && (
            <div class="github-add-repo-form">
              <div class="form-row">
                <input
                  class="input"
                  placeholder={STRINGS.parent.settings.deckRepos.namePlaceholder}
                  value={repoForm.name}
                  onInput={(e) => setRepoForm({ ...repoForm, name: e.currentTarget.value })}
                />
              </div>
              <div class="form-row">
                <input
                  class="input"
                  placeholder={STRINGS.parent.settings.deckRepos.repoPlaceholder}
                  value={repoForm.repo}
                  onInput={(e) => setRepoForm({ ...repoForm, repo: e.currentTarget.value })}
                />
              </div>
              {repoFormError && <div class="text-error" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{repoFormError}</div>}
              <div class="row" style={{ gap: '8px' }}>
                <button type="button" class="btn btn--sm btn--accent" onClick={handleAddRepoInModal}>
                  {STRINGS.parent.settings.deckRepos.addSubmit}
                </button>
                <button type="button" class="btn btn--sm" onClick={() => { setShowAddRepo(false); setRepoFormError(''); }}>
                  {STRINGS.parent.settings.deckRepos.addCancel}
                </button>
              </div>
            </div>
          )}

          {error && <div class="alert alert--error">{error}</div>}

          {fetching && (
            <div class="github-loading">
              <div class="spinner" />
              <span>{STRINGS.parent.decks.githubImport.fetching}</span>
            </div>
          )}

          {!fetching && files.length > 0 && (
            <div class="github-file-list">
              {files.map((f) => (
                <div
                  key={f.name}
                  class={`github-file-row ${f.isImported ? 'github-file-row--imported' : ''}`}
                >
                  {!f.isImported && (
                    <input
                      type="checkbox"
                      checked={selected.has(f.name)}
                      onChange={() => toggleSelect(f.name)}
                    />
                  )}
                  <span class="github-file-row__name">{f.name}</span>
                  <span class="github-file-row__deck-name">
                    {f.content?.name}{' '}
                    <span class="text-soft">
                      ({STRINGS.parent.decks.githubImport.cardsCount(f.content?.cards?.length || 0)})
                    </span>
                  </span>
                  {f.isImported && (
                    <>
                      <span class="chip chip--secondary">
                        {STRINGS.parent.decks.githubImport.alreadyImported}
                      </span>
                      <button
                        class="btn btn--small btn--ghost"
                        onClick={() => handleReImport(f)}
                        disabled={importing}
                      >
                        {STRINGS.parent.decks.githubImport.reImport}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <div class="modal__footer">
            <button class="btn btn--lg" onClick={handleImport} disabled={importing}>
              {importing ? STRINGS.parent.decks.githubImport.fetching : STRINGS.parent.decks.githubImport.importButton(selected.size)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function selectedRepoLabel(repo) {
  if (!repo) return '';
  return `${repo.repo}${repo.path ? `:${repo.path}` : ''}`;
}