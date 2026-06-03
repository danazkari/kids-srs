import { useState, useEffect, useRef } from 'preact/hooks';
import { STRINGS } from '../i18n.js';

export function TimerBar({ timerMinutes, startedAt, pausedAt, pauseDuration, onPauseToggle, isPaused }) {
  const [remaining, setRemaining] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!timerMinutes) return;

    const totalMs = timerMinutes * 60 * 1000;

    function calculateRemaining() {
      const now = Date.now();
      const elapsed = now - startedAt;
      const pausedTime = pausedAt ? now - pausedAt : 0;
      const netElapsed = elapsed - pauseDuration - pausedTime;
      return Math.max(0, totalMs - netElapsed);
    }

    function tick() {
      setRemaining(calculateRemaining());
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerMinutes, startedAt, pauseDuration, pausedAt]);

  if (!timerMinutes) return null;

  const totalMs = timerMinutes * 60 * 1000;
  const currentRemaining = remaining ?? totalMs;
  const fraction = currentRemaining / totalMs;

  const mm = String(Math.floor(currentRemaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((currentRemaining % 60000) / 1000)).padStart(2, '0');

  let barColor;
  if (fraction > 0.5) {
    barColor = 'var(--accent)';
  } else if (fraction > 0.25) {
    barColor = '#f59e0b';
  } else {
    barColor = '#9ca3af';
  }

  return (
    <div class="timer-bar">
      <button
        class="timer-bar__pause-btn"
        onClick={onPauseToggle}
        aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? '▶️' : '⏸️'}
      </button>
      <span class="timer-bar__time">
        {mm}:{ss}
        {isPaused && <span class="timer-bar__paused-label"> ({STRINGS.kid.session.paused})</span>}
      </span>
      <div class="timer-bar__track">
        <div
          class="timer-bar__fill"
          style={{ width: `${fraction * 100}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}