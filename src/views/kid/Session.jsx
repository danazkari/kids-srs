import { useEffect, useMemo, useRef, useState, useCallback } from 'preact/hooks';
import { getDeck, countDue } from '../../db/decks.js';
import { getSrsForDeck, putSrs } from '../../db/srs.js';
import { createSession, updateSession, findResumableSession } from '../../db/sessions.js';
import { listBadges, awardBadges } from '../../db/badges.js';
import { newSrsState, applyGrade, GRADE } from '../../srs/algorithm.js';
import { buildSessionQueue, srsMapFromList } from '../../srs/queue.js';
import { collectBadgeContext, computeEligibleBadgeIds } from '../../badges/evaluator.js';
import { listSessions } from '../../db/sessions.js';
import { listDecks } from '../../db/decks.js';
import { cancelSpeech } from '../../speech/index.js';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Confetti } from '../../components/Confetti.jsx';
import { BadgeModal } from './BadgeModal.jsx';
import { SpellingCard } from './cards/SpellingCard.jsx';
import { PhraseCard } from './cards/PhraseCard.jsx';
import { FactCard } from './cards/FactCard.jsx';
import { AudioCard } from './cards/AudioCard.jsx';
import { showToast } from '../../components/toast.js';
import { STRINGS } from '../../i18n.js';

export function Session({ deckId, profile, navigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deck, setDeck] = useState(null);
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState([]);
  const [newBadgesToShow, setNewBadgesToShow] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [confettiTick, setConfettiTick] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const srsMapRef = useRef(new Map());

  // Initial setup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getDeck(deckId);
        if (!d) throw new Error('Deck not found');
        if (cancelled) return;
        setDeck(d);
        // Offer to resume same-day session (including abandoned ones)
        const resumable = await findResumableSession(deckId);
        const { due } = await countDue(deckId);
        if (due === 0 && !resumable) {
          // Nothing due and no session history today — show empty state
          setLoading(false);
          return;
        }
        if (resumable) {
          if (resumable.abandoned) {
            // Abandoned session: skip the modal, start a fresh session
            // immediately so the kid can study remaining cards (countDue
            // may be 0 because prior answers are already in srsState).
            await startNew(d, null);
          } else {
            // In-progress session: show resume modal.
            await startNew(d, resumable);
            setShowResume(true);
          }
        } else {
          await startNew(d);
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      cancelSpeech();
    };
  }, [deckId]);

  async function startNew(d, resumeSession = null) {
    const srsList = await getSrsForDeck(d.id);
    const srsMap = srsMapFromList(srsList);
    srsMapRef.current = srsMap;
    const size = d.sessionSize || profile.settings.sessionSize;
    const q = buildSessionQueue({ cards: d.cards, srsByCardId: srsMap, sessionSize: size });
    if (q.length === 0) {
      setQueue([]);
      return;
    }
    if (resumeSession) {
      // Recreate queue, but skip ahead
      setSession(resumeSession);
      setIndex(Math.min(resumeSession.currentIndex || 0, q.length - 1));
      setQueue(q);
    } else {
      const s = await createSession({ deckId: d.id });
      setSession(s);
      setIndex(0);
      setQueue(q);
    }
  }

  // Card result handler
  const onCardResult = useCallback(
    async (result) => {
      if (!session || !deck) return;
      // Bare `advance` (no grade) means the user clicked "Next" after
      // a grade was already applied — spelling cards do this so the
      // user can read the correction before moving on.
      if (result.advance && result.grade === undefined) {
        setIndex((i) => i + 1);
        return;
      }
      if (result.grade === undefined) return;
      const card = queue[index];
      // Update SRS state
      const existing = srsMapRef.current.get(card.id);
      const state = existing
        ? applyGrade(existing, result.grade)
        : applyGrade(newSrsState(card.id, deck.id), result.grade);
      srsMapRef.current.set(card.id, state);
      await putSrs(state);

      // Update session counters
      const newSession = { ...session };
      newSession.cardsReviewed = (newSession.cardsReviewed || 0) + 1;
      if (card.type === 'spelling') {
        if (result.grade === GRADE.PASS) {
          newSession.cardsCorrect = (newSession.cardsCorrect || 0) + 1;
          setStreak((s) => s + 1);
        } else {
          setStreak(0);
        }
      } else {
        if (result.grade === GRADE.PASS)
          newSession.selfGrades.knew = (newSession.selfGrades.knew || 0) + 1;
        else if (result.grade === GRADE.ALMOST)
          newSession.selfGrades.almost = (newSession.selfGrades.almost || 0) + 1;
        else newSession.selfGrades.notYet = (newSession.selfGrades.notYet || 0) + 1;
        if (result.grade === GRADE.PASS) setStreak((s) => s + 1);
        else setStreak(0);
      }
      newSession.currentIndex = index + 1;
      newSession.durationSeconds = Math.round((Date.now() - newSession.startedAt) / 1000);
      const updated = await updateSession(newSession.id, newSession);
      setSession(updated);
      setStats({
        correct: (updated.cardsCorrect || 0) + (updated.selfGrades?.knew || 0),
        total: updated.cardsReviewed
      });
      // Advance to the next card. Phrase/Audio cards pass
      // {grade, advance: true}; spelling cards omit `advance` and
      // advance themselves after the user clicks "Next".
      if (result.advance) {
        setIndex((i) => i + 1);
      }
    },
    [session, deck, queue, index]
  );

  // When the queue is finished
  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (queue.length === 0) return;
    if (index >= queue.length) {
      completeSession();
    }
  }, [index, queue.length, session, loading]);

  async function completeSession() {
    if (!session) return;
    if (session.completedAt) return;
    const final = await updateSession(session.id, {
      completedAt: Date.now(),
      durationSeconds: Math.round((Date.now() - session.startedAt) / 1000)
    });

    // Re-evaluate all badges
    const [sessions, decks, owned] = await Promise.all([listSessions(), listDecks(), listBadges()]);
    const ctx = collectBadgeContext({ sessions, srsList: [], decks, lastSession: final });
    const eligible = computeEligibleBadgeIds(ctx);
    const ownedIds = new Set(owned.map((b) => b.id));
    const newOnes = eligible.filter((id) => !ownedIds.has(id));
    let newlyAwarded = [];
    if (newOnes.length) newlyAwarded = await awardBadges(newOnes);

    if (newlyAwarded.length) {
      setBadgesEarned((prev) => [...prev, ...newlyAwarded]);
    }

    setDone(true);
    setConfettiTick((t) => t + 1);
    if (newlyAwarded.length) {
      setTimeout(() => setNewBadgesToShow(newlyAwarded), 600);
    }
  }

  // Loading / error states
  if (loading) {
    return (
      <div class="kid-view center">
        <div class="empty">
          <div class="emoji">⏳</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div class="kid-view center">
        <div class="empty">
          <div class="emoji">😢</div>
          <p>{error}</p>
          <button class="btn" onClick={() => navigate('/')}>
            {STRINGS.kid.badges.close}
          </button>
        </div>
      </div>
    );
  }
  if (!deck) return null;
  if (queue.length === 0) {
    return (
      <div class="kid-view center">
        <div class="all-done-card">
          <div class="emoji">🌟</div>
          <h2>{STRINGS.kid.home.allDone}</h2>
          <p class="text-soft">{STRINGS.kid.home.allDoneSub}</p>
          <button class="btn btn--lg" onClick={() => navigate('/')}>
            ← Home
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    const isPerfect = stats.correct === stats.total && stats.total > 0;
    return (
      <div class="done-screen anim-fade">
        <Confetti trigger={confettiTick} />
        <div class="big-emoji">{isPerfect ? '✨' : '🎉'}</div>
        <h1>{isPerfect ? STRINGS.kid.session.perfect : STRINGS.kid.session.doneTitle}</h1>
        <p class="text-soft">{STRINGS.kid.session.doneSub(stats.total)}</p>
        <div class="done-screen__stats">
          <div class="done-stat">
            <div class="done-stat__num">{stats.total}</div>
            <div class="done-stat__label">reviewed</div>
          </div>
          <div class="done-stat">
            <div class="done-stat__num">{stats.correct}</div>
            <div class="done-stat__label">got it</div>
          </div>
          <div class="done-stat">
            <div class="done-stat__num">{streak}</div>
            <div class="done-stat__label">streak</div>
          </div>
        </div>
        <div class="row" style={{ marginTop: '20px' }}>
          <button class="btn btn--lg" onClick={() => navigate('/')}>
            {STRINGS.kid.session.doneHome}
          </button>
        </div>
      </div>
    );
  }

  const card = queue[index];
  const total = queue.length;

  return (
    <div class="kid-view">
      <header class="kid-top-bar">
        <button class="icon-btn" onClick={() => setShowLeaveConfirm(true)} aria-label="home">
          🏠
        </button>
        <div class="kid-top-bar__title">{deck.name}</div>
        <span style={{ minWidth: '48px' }} aria-hidden="true" />
      </header>

      <div class="kid-session">
        <div class="session-header">
          <div class="session-progress-row">
            <div>{STRINGS.kid.session.cardN(Math.min(index + 1, total), total)}</div>
            <div class="spacer" />
          </div>
          <ProgressBar value={index} max={total} label="session progress" />
        </div>

        <div class="card-area">
          {card && card.type === 'spelling' && (
            <SpellingCard
              key={card.id}
              card={card}
              layout={profile.settings.keyboardLayout}
              onResult={onCardResult}
            />
          )}
          {card && card.type === 'phrase' && (
            <PhraseCard key={card.id} card={card} onResult={onCardResult} />
          )}
          {card && card.type === 'fact' && <FactCard key={card.id} card={card} onResult={onCardResult} />}
          {card && card.type === 'audio' && (
            <AudioCard
              key={card.id}
              card={card}
              deck={deck}
              audioSettings={profile.settings}
              onResult={onCardResult}
            />
          )}
        </div>
      </div>

      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={STRINGS.kid.session.leaveConfirm}
      >
        <p style={{ textAlign: 'center', marginBottom: '16px' }}>
          {STRINGS.kid.session.leaveConfirmBody}
        </p>
        <div class="row" style={{ justifyContent: 'center' }}>
          <button class="btn btn--ghost" onClick={() => setShowLeaveConfirm(false)}>
            {STRINGS.kid.session.leaveConfirmNo}
          </button>
          <button class="btn btn--orange" onClick={() => navigate('/')}>
            {STRINGS.kid.session.leaveConfirmYes}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!showResume}
        onClose={async () => {
          const resumable = await findResumableSession(deckId);
          if (resumable)
            await updateSession(resumable.id, { completedAt: Date.now(), abandoned: true });
          await startNew(deck, null);
          setShowResume(false);
        }}
        title={STRINGS.kid.session.resumed}
      >
        <div class="row" style={{ justifyContent: 'center' }}>
          <button
            class="btn"
            onClick={() => {
              setShowResume(false);
            }}
          >
            Yes, continue
          </button>
          <button
            class="btn btn--ghost"
            onClick={() => {
              setShowResume(false);
            }}
          >
            Start fresh
          </button>
        </div>
      </Modal>

      {newBadgesToShow && (
        <BadgeModal
          open={!!newBadgesToShow}
          onClose={() => setNewBadgesToShow(null)}
          earned={badgesEarned}
          newlyEarned={newBadgesToShow}
        />
      )}
    </div>
  );
}
