import { useEffect, useRef, useState } from 'preact/hooks';
import { STRINGS } from '../../i18n.js';

const COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 3;

function randomQuestion() {
  const a = 2 + Math.floor(Math.random() * 8); // 2..9
  const b = 2 + Math.floor(Math.random() * 8);
  return { a, b, answer: a * b };
}

export function Gate({ onSuccess, onCancel }) {
  const [q, setQ] = useState(() => randomQuestion());
  const [val, setVal] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'good' | 'bad'
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, [q]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [cooldownUntil]);

  const locked = cooldownUntil > now;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  function check() {
    const n = Number(val);
    if (!Number.isFinite(n)) {
      setFeedback('bad');
      bumpAttempt();
      return;
    }
    if (n === q.answer) {
      setFeedback('good');
      setTimeout(() => onSuccess && onSuccess(), 250);
      return;
    }
    setFeedback('bad');
    bumpAttempt();
  }

  function bumpAttempt() {
    setAttempts((a) => {
      const na = a + 1;
      if (na >= MAX_ATTEMPTS) {
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        setQ(randomQuestion());
        setVal('');
        return 0;
      }
      setQ(randomQuestion());
      setVal('');
      return na;
    });
  }

  return (
    <div class="screen center" style={{ padding: '24px' }}>
      <div class="gate-card anim-slide-up">
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h1>{STRINGS.parent.gate.title}</h1>
        <p class="text-soft">{STRINGS.parent.gate.subtitle}</p>
        <div class="gate-card__question">
          {q.a} × {q.b} = ?
        </div>
        <input
          ref={inputRef}
          class="input gate-card__input"
          type="number"
          inputMode="numeric"
          autocomplete="off"
          value={val}
          onInput={(e) => setVal(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') check();
          }}
          disabled={locked}
        />
        {feedback === 'good' && (
          <div class="gate-card__feedback gate-card__feedback--good">
            {STRINGS.parent.gate.correct}
          </div>
        )}
        {feedback === 'bad' && !locked && (
          <div class="gate-card__feedback gate-card__feedback--bad">
            {STRINGS.parent.gate.wrong}
          </div>
        )}
        {locked && (
          <div class="gate-card__feedback gate-card__feedback--bad">
            {STRINGS.parent.gate.lockedOut} {remaining}s
          </div>
        )}
        <div class="row" style={{ justifyContent: 'center' }}>
          <button class="btn" onClick={check} disabled={locked || !val}>
            Check
          </button>
          <button class="btn btn--ghost" onClick={onCancel}>
            {STRINGS.parent.gate.back}
          </button>
        </div>
      </div>
    </div>
  );
}
