import { useState } from 'preact/hooks';
import { getDeckBySource, createDeck, updateDeck, validateDeckJson } from '../../db/decks.js';
import { STRINGS } from '../../i18n.js';

export function GitHubModal({ open, onClose, onImport }) {
  const [repoInput, setRepoInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  function parseRepoInput(input) {
    const m = input.match(/^([^/]+)\/([^/:]+)(?::(.+))?$/);
    if (!m) return null;
    return { owner: m[1], repo: m[2], path: m[3] || '' };
  }

  async function fetchFiles() {
    const parsed = parseRepoInput(repoInput.trim());
    if (!parsed) {
      setError(STRINGS.parent.decks.githubImport.errors.invalidFormat);
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${parsed.path}`;
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

      // Fetch each file's content and check if already imported
      const fileInfos = await Promise.all(
        jsonFiles.map(async (item) => {
          try {
            const fileResp = await fetch(item.download_url);
            const content = await fileResp.json();
            const { deck } = validateDeckJson(content);
            const sourceRepo = `${parsed.owner}/${parsed.repo}`;
            const sourcePath = (parsed.path ? parsed.path + '/' : '') + item.name;
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

      setFiles(fileInfos.filter((f) => !f.parseError));
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
      // Get the sha from the file's GitHub content to store as sourceCommit
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

  const canImport = selected.size > 0 && !importing;

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
          <div class="github-repo-input">
            <input
              type="text"
              class="input"
              placeholder={STRINGS.parent.decks.githubImport.repoPlaceholder}
              value={repoInput}
              onInput={(e) => setRepoInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
            />
            <button class="btn" onClick={fetchFiles} disabled={fetching || !repoInput.trim()}>
              {fetching ? STRINGS.parent.decks.githubImport.fetching : STRINGS.parent.decks.githubImport.fetchFiles}
            </button>
          </div>

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
            <button class="btn btn--lg" onClick={handleImport} disabled={!canImport}>
              {importing ? STRINGS.parent.decks.githubImport.fetching : STRINGS.parent.decks.githubImport.importButton(selected.size)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}