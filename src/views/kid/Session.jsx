import { useEffect, useMemo, useRef, useState, useCallback } from 'preact/hooks';
import { getDeck, countDue } from '../../db/decks.js';
import { getSrsForDeck, putSrs } from '../../db/srs.js';
import {
  createSession,
  updateSession,
  findResumableSession,
  listSessions
} from '../../db/sessions.js';
import { listBadges, awardBadges } from '../../db/badges.js';
import { newSrsState, applyGrade, GRADE } from '../../srs/algorithm.js';
import { buildSessionQueue, srsMapFromList } from '../../srs/queue.js';
import { collectBadgeContext, computeEligibleBadgeIds } from '../../badges/evaluator.js';
import { listDecks } from '../../db/decks.js';
import { calcStreak } from '../../utils/index.js';
import { cancelSpeech } from '../../speech/index.js';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Confetti } from '../../components/Confetti.jsx';
import { TimerBar } from '../../components/TimerBar.jsx';
import { BadgeModal } from './BadgeModal.jsx';
import { SpellingCard } from './cards/SpellingCard.jsx';
import { PhraseCard } from './cards/PhraseCard.jsx';
import { FactCard } from './cards/FactCard.jsx';
import { AudioCard } from './cards/AudioCard.jsx';
import { showToast } from '../../components/toast.js';
import { STRINGS } from '../../i18n.js';

export function Session({ deckId, timerMinutes = null, profile, navigate }) {
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
  const [timerExpired, setTimerExpired] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRestartOverlay, setShowRestartOverlay] = useState(false);
  const [currentPausedAt, setCurrentPausedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const srsMapRef = useRef(new Map());
  const timerMinutesRef = useRef(timerMinutes);
  const pausedForModalRef = useRef(false);

  // Keep timerMinutes ref up to date
  useEffect(() => {
    timerMinutesRef.current = timerMinutes;
  }, [timerMinutes]);

  // Pause timer when leave confirm is shown, resume when it closes
  useEffect(() => {
    if (!timerMinutesRef.current || !session) return;

    if (showLeaveConfirm && !isPaused) {
      pausedForModalRef.current = true;
      const now = Date.now();
      updateSession(session.id, { pausedAt: now }).then((updated) => {
        setSession(updated);
        setIsPaused(true);
        setCurrentPausedAt(now);
      });
    } else if (!showLeaveConfirm && isPaused && pausedForModalRef.current) {
      pausedForModalRef.current = false;
      const now = Date.now();
      const pauseMs = currentPausedAt ? now - currentPausedAt : 0;
      updateSession(session.id, {
        pausedAt: null,
        pauseDuration: (session.pauseDuration || 0) + pauseMs
      }).then((updated) => {
        setSession(updated);
        setIsPaused(false);
        setCurrentPausedAt(null);
      });
    }
  }, [showLeaveConfirm, isPaused, session, currentPausedAt]);

  // Timer effect
  useEffect(() => {
    if (done || loading || !session) return;
    const interval = setInterval(() => {
      if (session.startedAt) {
        setElapsedSeconds(Math.floor((Date.now() - session.startedAt) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [done, loading, session]);

  // Initial setup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getDeck(deckId);
        if (!d) throw new Error('Deck not found');
        if (cancelled) return;
        setDeck(d);
        const resumable = await findResumableSession(deckId);
        const { due } = await countDue(deckId);
        if (due === 0 && !resumable) {
          setLoading(false);
          return;
        }
        if (resumable) {
          if (resumable.completedAt || resumable.abandoned) {
            await startNew(d, null, timerMinutesRef.current);
          } else {
            await startNew(d, resumable, null);
            setShowResume(true);
          }
        } else {
          await startNew(d, null, timerMinutesRef.current);
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

  async function startNew(d, resumeSession = null, timerMins = null) {
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
      setSession(resumeSession);
      setIndex(Math.min(resumeSession.currentIndex || 0, q.length - 1));
      setQueue(q);
    } else {
      const s = await createSession({ deckId: d.id, timerMinutes: timerMins });
      setSession(s);
      setIndex(0);
      setQueue(q);
    }
  }

  const handlePauseToggle = useCallback(async () => {
    if (!session || !timerMinutesRef.current) return;

    if (isPaused) {
      // Resume: calculate paused duration and update session
      const now = Date.now();
      const pauseMs = currentPausedAt ? now - currentPausedAt : 0;
      const updated = await updateSession(session.id, {
        pausedAt: null,
        pauseDuration: (session.pauseDuration || 0) + pauseMs
      });
      setSession(updated);
      setIsPaused(false);
      setCurrentPausedAt(null);
    } else {
      // Pause: record pausedAt timestamp
      const updated = await updateSession(session.id, { pausedAt: Date.now() });
      setSession(updated);
      setIsPaused(true);
      setCurrentPausedAt(Date.now());
    }
  }, [session, isPaused, currentPausedAt]);

  // Card result handler
  const onCardResult = useCallback(
    async (result) => {
      if (!session || !deck) return;
      if (result.advance && result.grade === undefined) {
        setIndex((i) => i + 1);
        return;
      }
      if (result.grade === undefined) return;
      const card = queue[index];
      const existing = srsMapRef.current.get(card.id);
      const state = existing
        ? applyGrade(existing, result.grade)
        : applyGrade(newSrsState(card.id, deck.id), result.grade);
      srsMapRef.current.set(card.id, state);
      await putSrs(state);

      const newSession = { ...session };
      newSession.cardsReviewed = (newSession.cardsReviewed || 0) + 1;
      if (card.type === 'spelling') {
        if (result.grade === GRADE.PASS) {
          newSession.cardsCorrect = (newSession.cardsCorrect || 0) + 1;
        }
      } else {
        if (result.grade === GRADE.PASS)
          newSession.selfGrades.knew = (newSession.selfGrades.knew || 0) + 1;
        else if (result.grade === GRADE.ALMOST)
          newSession.selfGrades.almost = (newSession.selfGrades.almost || 0) + 1;
        else newSession.selfGrades.notYet = (newSession.selfGrades.notYet || 0) + 1;
      }
      newSession.currentIndex = index + 1;
      newSession.durationSeconds = Math.round((Date.now() - newSession.startedAt) / 1000);
      const updated = await updateSession(newSession.id, newSession);
      setSession(updated);
      setStats({
        correct: (updated.cardsCorrect || 0) + (updated.selfGrades?.knew || 0),
        total: updated.cardsReviewed
      });

      // If timer expired and this was the last card, end session
      if (result.advance && timerExpired && index + 1 >= queue.length) {
        // Timer expired during this card — complete session now
        await finalizeSession(updated);
        return;
      }

      if (result.advance) {
        setIndex((i) => i + 1);
      }
    },
    [session, deck, queue, index, timerExpired]
  );

  // When the queue is finished (normal completion or timer-triggered)
  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (queue.length === 0) return;
    if (index >= queue.length) {
      // If timer expired and we're out of cards, end session
      if (timerExpired) {
        finalizeSession(session);
        return;
      }
      // If queue empty but time remains, restart queue
      if (timerMinutesRef.current && !timerExpired) {
        triggerQueueRestart();
        return;
      }
      completeSession();
    }
  }, [index, queue.length, session, loading, timerExpired]);

  async function finalizeSession(sess) {
    const final = await updateSession(sess.id, {
      completedAt: Date.now(),
      durationSeconds: Math.round((Date.now() - sess.startedAt) / 1000),
      endedByTimer: timerExpired
    });
    const [sessions, decks, owned] = await Promise.all([listSessions(), listDecks(), listBadges()]);
    const ctx = collectBadgeContext({ sessions, srsList: [], decks, lastSession: final });
    const eligible = computeEligibleBadgeIds(ctx);
    const ownedIds = new Set(owned.map((b) => b.id));
    const newOnes = eligible.filter((id) => !ownedIds.has(id));
    let newlyAwarded = [];
    if (newOnes.length) newlyAwarded = await awardBadges(newOnes);

    if (newlyAwarded.length) setBadgesEarned((prev) => [...prev, ...newlyAwarded]);

    setDone(true);
    setConfettiTick((t) => t + 1);
    if (newlyAwarded.length) setTimeout(() => setNewBadgesToShow(newlyAwarded), 600);
  }

  async function triggerQueueRestart() {
    setShowRestartOverlay(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (!session) return;
    const srsList = await getSrsForDeck(deck.id);
    const srsMap = srsMapFromList(srsList);
    srsMapRef.current = srsMap;
    const size = deck.sessionSize || profile.settings.sessionSize;
    const q = buildSessionQueue({ cards: deck.cards, srsByCardId: srsMap, sessionSize: size });
    if (q.length === 0) {
      // Nothing due — show all done
      setShowRestartOverlay(false);
      setQueue([]);
      return;
    }
    setQueue(q);
    setIndex(0);
    setShowRestartOverlay(false);
  }

  async function completeSession() {
    if (!session) return;
    if (session.completedAt) return;
    await finalizeSession(session);
  }

  // Compute consecutive-days streak at done-screen render time.
  useEffect(() => {
    if (!done) return;
    listSessions().then((sessions) => setStreak(calcStreak(sessions)));
  }, [done]);

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
    const endedByTimer = session?.endedByTimer;
    return (
      <div class="done-screen anim-fade">
        <Confetti trigger={confettiTick} />
        <div class="big-emoji">
          {endedByTimer ? '⏱️' : isPerfect ? '✨' : '🎉'}
        </div>
        <h1>
          {endedByTimer
            ? STRINGS.kid.session.timerExpired
            : isPerfect
            ? STRINGS.kid.session.perfect
            : STRINGS.kid.session.doneTitle}
        </h1>
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

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  return (
    <div class="kid-view">
      <header class="kid-top-bar">
        <button class="icon-btn" onClick={() => setShowLeaveConfirm(true)} aria-label="home">
          🏠
        </button>
        <div class="kid-top-bar__title">{deck.name}</div>
        <div class="session-timer" aria-label="elapsed time">
          ⏱️ {formatTime(elapsedSeconds)}
        </div>
      </header>

      <div class="kid-session">
        <div class="session-header">
          {timerMinutes && session && (
            <TimerBar
              timerMinutes={timerMinutes}
              startedAt={session.startedAt}
              pausedAt={session.pausedAt}
              pauseDuration={session.pauseDuration || 0}
              onPauseToggle={handlePauseToggle}
              isPaused={isPaused}
            />
          )}
          <div class="session-progress-row">
            <div>{STRINGS.kid.session.cardN(Math.min(index + 1, total), total)}</div>
            <div class="spacer" />
          </div>
          <ProgressBar value={index} max={total} label="session progress" />
        </div>

        {showRestartOverlay && (
          <div class="more-cards-overlay">
            <div class="more-cards-overlay__content">
              <div class="more-cards-overlay__emoji">🔄</div>
              <div class="more-cards-overlay__title">{STRINGS.kid.session.moreCardsComing}</div>
              <div class="circular-countdown">
                <svg viewBox="0 0 36 36" class="circular-countdown__svg">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="100"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    class="circular-countdown__ring"
                  />
                </svg>
                <span class="circular-countdown__text">3</span>
              </div>
              <div class="more-cards-overlay__sub">{STRINGS.kid.session.restartIn}...</div>
            </div>
          </div>
        )}

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
          {card && card.type === 'fact' && (
            <FactCard key={card.id} card={card} onResult={onCardResult} />
          )}
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
            onClick={async () => {
              const resumable = await findResumableSession(deckId);
              if (resumable)
                await updateSession(resumable.id, { completedAt: Date.now(), abandoned: true });
              await startNew(deck, null);
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
