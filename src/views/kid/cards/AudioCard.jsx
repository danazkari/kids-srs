import { useEffect, useRef, useState } from 'preact/hooks';
import { CardMedia } from './CardMedia.jsx';
import { speak, pickBestVoice, getVoices, cancelSpeech } from '../../../speech/index.js';
import { STRINGS } from '../../../i18n.js';

export function AudioCard({ card, deck, audioSettings, onResult }) {
  const [flipped, setFlipped] = useState(false);
  const [voice, setVoice] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const flippedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const voices = await getVoices();
      if (cancelled) return;
      setVoice(pickBestVoice(voices, deck.language, deck.voiceURI));
      setVoiceReady(true);
    })();
    return () => {
      cancelled = true;
      cancelSpeech();
    };
  }, [deck.language, deck.voiceURI]);

  function flip() {
    if (flippedOnceRef.current) return;
    flippedOnceRef.current = true;
    setFlipped(true);
    if (audioSettings.audioAutoPlay) {
      // Speak on next tick so the user-gesture path is preserved.
      setTimeout(() => speak(card.answer, { lang: deck.language, voice }), 0);
    }
  }

  function replay() {
    speak(card.answer, { lang: deck.language, voice });
  }

  function grade(g) {
    onResult && onResult({ grade: g, advance: true });
  }

  if (!flipped) {
    return (
      <div class="study-card study-card--flippable anim-fade" onClick={flip}>
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
      {audioSettings.audioReplayButton && voiceReady && voice && (
        <button class="audio-replay" onClick={replay} aria-label={STRINGS.kid.session.audioReplay}>
          🔊
        </button>
      )}
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
