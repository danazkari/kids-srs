// Renders a card's media: emoji and optional image with a graceful
// placeholder fallback when the image URL fails.

import { useState } from 'preact/hooks';

export function CardMedia({ card, emojiSize = '4rem' }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (card.emoji && !card.image) {
    return <div class="study-card__emoji" style={{ fontSize: emojiSize }}>{card.emoji}</div>;
  }
  if (card.image && !imageFailed) {
    return (
      <img
        class="study-card__image"
        src={card.image}
        alt=""
        onError={() => setImageFailed(true)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  if (card.emoji) {
    return <div class="study-card__image--placeholder" aria-hidden="true">{card.emoji}</div>;
  }
  return <div class="study-card__image--placeholder" aria-hidden="true">🖼️</div>;
}
