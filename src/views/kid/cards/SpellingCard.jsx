import { useState, useRef, useEffect } from 'preact/hooks';
import { OnScreenKeyboard } from '../OnScreenKeyboard.jsx';
import { CardMedia } from './CardMedia.jsx';
import { checkSpelling, letterCompare } from '../../../srs/algorithm.js';
import { STRINGS } from '../../../i18n.js';

export function SpellingCard({ card, layout, onResult, registerKeys }) {
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // 'correct' | 'wrong' | null
  const hiddenRef = useRef(null);

  function onKey(key) {
    if (submitted) return;
    if (key === 'Backspace') {
      setTyped((t) => t.slice(0, -1));
    } else if (key === 'Enter') {
      submit();
    } else if (/^[a-z]$/.test(key)) {
      setTyped((t) => (t + key).slice(0, 24));
    }
  }

  // Allow parent to focus the hidden input.
  useEffect(() => {
    if (registerKeys) registerKeys({ focus: () => hiddenRef.current && hiddenRef.current.focus() });
  }, [registerKeys]);

  function submit() {
    if (!typed.trim()) return;
    const correct = checkSpelling(typed, card.answer);
    setSubmitted(true);
    setResult(correct ? 'correct' : 'wrong');
    onResult && onResult({ grade: correct ? 2 : 0, userAnswer: typed });
  }

  function next() {
    onResult && onResult({ advance: true });
  }

  const compare = submitted ? letterCompare(typed, card.answer) : [];

  return (
    <div class="study-card study-card--spelling anim-fade">
      <CardMedia card={card} />
      {card.prompt && <div class="study-card__prompt">{card.prompt}</div>}
      {!submitted ? (
        <>
          <div class="letter-boxes" aria-label={STRINGS.kid.session.typeHere}>
            {Array.from({ length: card.answer.length }).map((_, i) => (
              <div key={i} class={`letter-box ${i < typed.length ? '' : 'letter-box--blank'}`}>
                {typed[i] ? typed[i].toUpperCase() : ''}
              </div>
            ))}
          </div>
          <div class="text-soft" style={{ fontSize: '0.9rem' }}>
            {STRINGS.kid.session.typeHere}
          </div>
        </>
      ) : (
        <>
          <div class="letter-boxes">
            {compare.map((c, i) => (
              <div
                key={i}
                class={`letter-box ${c.status === 'missing' || c.status === 'correct' ? 'letter-box--correct' : 'letter-box--wrong'}`}
                aria-label={c.status}
              >
                {c.char.toUpperCase()}
              </div>
            ))}
          </div>
          <div class="spelling-actions">
            <button class="btn btn--secondary btn--lg" onClick={next}>
              {STRINGS.kid.session.next}
            </button>
          </div>
        </>
      )}
      <OnScreenKeyboard
        layout={layout}
        onKey={onKey}
        hiddenInputRef={hiddenRef}
        disabled={submitted}
      />
    </div>
  );
}
