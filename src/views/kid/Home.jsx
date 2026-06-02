import { useEffect, useState, useCallback } from 'preact/hooks';
import { listDecks, countDue } from '../../db/decks.js';
import { listBadges } from '../../db/badges.js';
import { STRINGS } from '../../i18n.js';
import { BadgeModal } from './BadgeModal.jsx';

export function Home({ profile, navigate }) {
  const [decks, setDecks] = useState([]);
  const [dueMap, setDueMap] = useState({});
  const [badges, setBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listDecks(false); // active only
    const counts = {};
    for (const d of all) counts[d.id] = await countDue(d.id);
    const bs = await listBadges();
    setDecks(all);
    setDueMap(counts);
    setBadges(bs);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function goToParent() {
    navigate('/parent/overview');
  }

  const totalDue = Object.values(dueMap).reduce((sum, c) => sum + (c?.due || 0), 0);

  return (
    <div class="kid-view">
      <header class="kid-top-bar">
        <button class="icon-btn" onClick={goToParent} aria-label="parent dashboard" title="Parent">
          🔒
        </button>
        <div class="kid-top-bar__title">🌟 {STRINGS.app.name}</div>
        <span style={{ width: '48px' }} />
      </header>

      <div class="kid-home">
        <div class="greeting">
          <h1>{STRINGS.kid.home.greeting(profile.name)}</h1>
          <p>{STRINGS.kid.home.subtitle}</p>
        </div>

        {loading ? (
          <div class="empty">
            <div class="emoji">⏳</div>
          </div>
        ) : decks.length === 0 ? (
          <div class="all-done-card">
            <div class="emoji">📭</div>
            <h2>{STRINGS.kid.home.noDecks}</h2>
          </div>
        ) : totalDue === 0 ? (
          <div class="all-done-card">
            <div class="emoji">🌟</div>
            <h2>{STRINGS.kid.home.allDone}</h2>
            <p class="text-soft">{STRINGS.kid.home.allDoneSub}</p>
            <div class="row" style={{ justifyContent: 'center', marginTop: '12px' }}>
              {decks.map((d) => (
                <div key={d.id} class="deck-card deck-card--all-done">
                  <div class="deck-card__icon">{d.cards[0]?.emoji || '📚'}</div>
                  <div class="deck-card__body">
                    <div class="deck-card__name">{d.name}</div>
                    <div class="deck-card__meta">
                      <span class="chip chip--green">✅ {STRINGS.kid.home.allDoneCta}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div class="deck-list">
            {decks.map((d) => {
              const c = dueMap[d.id] || { due: 0, newCount: 0 };
              const hasDue = c.due > 0;
              return (
                <div key={d.id} class="deck-card">
                  <div class="deck-card__icon">{d.cards[0]?.emoji || '📚'}</div>
                  <div class="deck-card__body">
                    <div class="deck-card__name">{d.name}</div>
                    <div class="deck-card__meta">
                      {hasDue ? (
                        <span class="chip">{STRINGS.kid.home.cardsDue(c.due)}</span>
                      ) : (
                        <span class="chip chip--green">✅ {STRINGS.kid.home.allDoneCta}</span>
                      )}
                      {c.newCount > 0 && hasDue && (
                        <span class="chip chip--accent">
                          {STRINGS.kid.home.newCards(c.newCount)}
                        </span>
                      )}
                      {d.tags?.slice(0, 2).map((t) => (
                        <span key={t} class="chip chip--secondary">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {hasDue ? (
                    <button
                      class="deck-card__cta"
                      onClick={() => navigate(`/session?deck=${encodeURIComponent(d.id)}`)}
                    >
                      {STRINGS.kid.home.startSession}
                    </button>
                  ) : (
                    <span class="deck-card__cta deck-card__cta--done" aria-disabled="true">
                      ✅
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button class="badge-fab" onClick={() => setShowBadges(true)}>
          🏅 {STRINGS.kid.home.badgesButton} ({badges.length})
        </button>
        <div class="parent-link">
          <button class="text-link" onClick={goToParent}>
            {STRINGS.kid.home.parentLink}
          </button>
        </div>
      </div>

      <BadgeModal
        open={showBadges}
        onClose={() => setShowBadges(false)}
        earned={badges.map((b) => b.id)}
        newlyEarned={[]}
      />
    </div>
  );
}
