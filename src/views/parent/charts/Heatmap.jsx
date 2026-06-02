// Pure CSS heatmap. Each cell = a day. Colour intensity = session count.
import { useMemo } from 'preact/hooks';
import { todayIso, startOfDay } from '../../../utils/index.js';

const DAY_MS = 86_400_000;

function levelClass(n) {
  if (!n) return '0';
  if (n === 1) return '1';
  if (n === 2) return '2';
  if (n === 3) return '3';
  return '4';
}

export function Heatmap({ sessions = [], days = 84 }) {
  const cells = useMemo(() => {
    const counts = new Map();
    for (const s of sessions) {
      if (s.completedAt && !s.abandoned) {
        const k = s.date;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    // Build `days` cells ending today, aligned to weeks.
    const today = startOfDay(Date.now());
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const ts = today - i * DAY_MS;
      const k = todayIso(new Date(ts));
      out.push({ date: k, n: counts.get(k) || 0 });
    }
    return out;
  }, [sessions, days]);

  return (
    <div>
      <div class="heatmap" role="img" aria-label="daily session count">
        {cells.map((c) => (
          <div
            key={c.date}
            class="heatmap__cell"
            data-level={levelClass(c.n)}
            title={`${c.date}: ${c.n} session${c.n === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <div class="heatmap__legend">
        <span>Less</span>
        <div class="heatmap__cell" data-level="0" style={{ width: 12, height: 12 }} />
        <div class="heatmap__cell" data-level="1" style={{ width: 12, height: 12 }} />
        <div class="heatmap__cell" data-level="2" style={{ width: 12, height: 12 }} />
        <div class="heatmap__cell" data-level="3" style={{ width: 12, height: 12 }} />
        <div class="heatmap__cell" data-level="4" style={{ width: 12, height: 12 }} />
        <span>More</span>
      </div>
    </div>
  );
}
