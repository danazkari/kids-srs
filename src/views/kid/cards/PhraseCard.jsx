import { useState } from 'preact/hooks';
import { CardMedia } from './CardMedia.jsx';
import { STRINGS } from '../../../i18n.js';

export function PhraseCard({ card, onResult }) {
  const [flipped, setFlipped] = useState(false);

  function grade(g) {
    onResult && onResult({ grade: g, advance: true });
  }

  if (!flipped) {
    return (
      <div class="study-card study-card--flippable anim-fade" onClick={() => setFlipped(true)}>
        <CardMedia card={card} />
        {card.prompt && <div class="study-card__prompt">{card.prompt}</div>}
        <div class="study-card__hint">{STRINGS.kid.session.tapToSeeAnswer}</div>
      </div>
    );
  }

  return (
    <div class="study-card anim-fade">
      <CardMedia card={card} />
      {card.prompt && (
        <div class="study-card__prompt text-soft" style={{ fontSize: '0.95rem' }}>
          {card.prompt}
        </div>
      )}
      <div class="study-card__answer">{card.answer}</div>
      <div class="grade-row">
        <button class="grade-btn grade-btn--notyet" onClick={() => grade(0)}>
          <span class="grade-btn__emoji">🔄</span>
          <span>{STRINGS.kid.session.notYet}</span>
        </button>
        <button class="grade-btn grade-btn--almost" onClick={() => grade(1)}>
          <span class="grade-btn__emoji">🤔</span>
          <span>{STRINGS.kid.session.almost}</span>
        </button>
        <button class="grade-btn grade-btn--knew" onClick={() => grade(2)}>
          <span class="grade-btn__emoji">😄</span>
          <span>{STRINGS.kid.session.knewIt}</span>
        </button>
      </div>
    </div>
  );
}
