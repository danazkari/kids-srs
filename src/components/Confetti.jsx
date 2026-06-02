import { useEffect, useState } from 'preact/hooks';

// Renders a confetti burst for `duration` ms.
export function Confetti({ trigger = 0, duration = 1600, count = 80 }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const colors = ['#ff85c1', '#85d4ff', '#ffc85a', '#6dd97b', '#b388ff', '#ff8c42'];
    const next = Array.from({ length: count }, (_, i) => ({
      id: `${trigger}-${i}`,
      left: Math.random() * 100,
      bg: colors[i % colors.length],
      delay: Math.random() * 200,
      duration: 1200 + Math.random() * 600
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(t);
  }, [trigger, duration, count]);
  if (!pieces.length) return null;
  return (
    <div class="confetti-host" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          class="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.bg,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`
          }}
        />
      ))}
    </div>
  );
}
