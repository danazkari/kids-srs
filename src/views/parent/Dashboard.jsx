import { useEffect, useMemo, useState } from 'preact/hooks';
import { listSessions } from '../../db/sessions.js';
import { listDecks } from '../../db/decks.js';
import { getAllSrs } from '../../db/srs.js';
import { listBadges } from '../../db/badges.js';
import { BADGES, BADGE_BY_ID } from '../../badges/definitions.js';
import { STRINGS } from '../../i18n.js';
import { todayIso, startOfDay } from '../../utils/index.js';
import { cssVar } from '../../theme.js';
import { LineChart } from './charts/LineChart.jsx';
import { BarChart } from './charts/BarChart.jsx';
import { DoughnutChart } from './charts/DoughnutChart.jsx';
import { Heatmap } from './charts/Heatmap.jsx';

const DAY_MS = 86_400_000;
const RANGES = [
  { id: 'd7', label: 'Last 7 days', days: 7 },
  { id: 'd30', label: 'Last 30 days', days: 30 },
  { id: 'all', label: 'All time', days: null }
];

function rangeStart(range) {
  if (!range.days) return 0;
  return startOfDay(Date.now()) - (range.days - 1) * DAY_MS;
}

function isoDay(ts) {
  return todayIso(new Date(ts));
}

function buildDateSeries(range) {
  if (!range.days) {
    return []; // we'll bucket by unique dates
  }
  const out = [];
  const today = startOfDay(Date.now());
  for (let i = range.days - 1; i >= 0; i--) {
    out.push(todayIso(new Date(today - i * DAY_MS)));
  }
  return out;
}

export function Dashboard() {
  const [rangeId, setRangeId] = useState('d7');
  const [sessions, setSessions] = useState([]);
  const [decks, setDecks] = useState([]);
  const [srsList, setSrsList] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, d, sr, b] = await Promise.all([
        listSessions(),
        listDecks(),
        getAllSrs(),
        listBadges()
      ]);
      setSessions(s.filter((x) => x.completedAt && !x.abandoned));
      setDecks(d);
      setSrsList(sr);
      setBadges(b);
    })();
  }, []);

  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0];
  const startTs = rangeStart(range);

  const inRange = (s) => s.startedAt >= startTs;

  const filtered = useMemo(() => sessions.filter(inRange), [sessions, startTs]);

  // Summary
  const totalCards = filtered.reduce((a, s) => a + (s.cardsReviewed || 0), 0);
  const totalCorrect = filtered.reduce(
    (a, s) => a + (s.cardsCorrect || 0) + (s.selfGrades?.knew || 0),
    0
  );
  const accuracy = totalCards ? Math.round((totalCorrect / totalCards) * 100) : 0;
  const totalSessions = filtered.length;
  const streak = useMemo(() => calcStreak(sessions), [sessions]);

  // Read theme colors at mount. When the user changes theme in Settings the
  // Dashboard tab unmounts, so the next time it's opened we re-read.
  const colors = useMemo(
    () => ({
      primary: cssVar('--primary'),
      secondary: cssVar('--secondary'),
      accent: cssVar('--accent'),
      green: cssVar('--green'),
      orange: cssVar('--orange'),
      purple: cssVar('--purple'),
      text: cssVar('--text-soft')
    }),
    []
  );

  // Daily cards line chart
  const dates = useMemo(() => buildDateSeries(range), [range]);
  const cardsByDate = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      const k = s.date;
      map.set(k, (map.get(k) || 0) + (s.cardsReviewed || 0));
    }
    return map;
  }, [filtered]);

  const dailyLabels = dates.length ? dates : [...new Set(filtered.map((s) => s.date))].sort();
  const dailyData = dailyLabels.map((d) => cardsByDate.get(d) || 0);

  // Session duration
  const durationByDate = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      const k = s.date;
      const mins = Math.round(((s.durationSeconds || 0) / 60) * 10) / 10;
      map.set(k, (map.get(k) || 0) + mins);
    }
    return map;
  }, [filtered]);
  const durationData = dailyLabels.map((d) => durationByDate.get(d) || 0);

  // Accuracy over time
  const accuracyByDate = useMemo(() => {
    const totMap = new Map();
    const corMap = new Map();
    for (const s of filtered) {
      totMap.set(s.date, (totMap.get(s.date) || 0) + (s.cardsReviewed || 0));
      corMap.set(
        s.date,
        (corMap.get(s.date) || 0) + (s.cardsCorrect || 0) + (s.selfGrades?.knew || 0)
      );
    }
    return dailyLabels.map((d) => {
      const t = totMap.get(d) || 0;
      const c = corMap.get(d) || 0;
      return t ? Math.round((c / t) * 100) : null;
    });
  }, [filtered, dailyLabels]);

  // Mastery doughnut (across all decks in range, or all time for 'all').
  // Buckets are mutually exclusive: overdue takes priority over the
  // interval-based buckets, since "is this card late?" is a separate
  // question from "how well-known is it?".
  const mastery = useMemo(() => computeMastery(srsList), [srsList]);

  // Hardest cards: top 10 by lapses
  const deckById = useMemo(() => new Map(decks.map((d) => [d.id, d])), [decks]);
  const cardIndex = useMemo(() => {
    const map = new Map();
    for (const d of decks) {
      for (const c of d.cards) map.set(c.id, { card: c, deck: d });
    }
    return map;
  }, [decks]);

  const hardest = useMemo(() => {
    return srsList
      .filter((s) => (s.lapses || 0) > 0)
      .sort((a, b) => (b.lapses || 0) - (a.lapses || 0))
      .slice(0, 10)
      .map((s) => {
        const meta = cardIndex.get(s.cardId);
        return {
          cardId: s.cardId,
          prompt: meta?.card?.prompt || '(missing card)',
          deckName: meta?.deck?.name || '?',
          lapses: s.lapses || 0,
          interval: s.interval || 0
        };
      });
  }, [srsList, cardIndex]);

  // Earned badges timeline
  const earnedBadges = useMemo(() => {
    return badges
      .map((b) => ({ ...b, ...BADGE_BY_ID[b.id] }))
      .filter((b) => b.name)
      .sort((a, b) => a.earnedAt - b.earnedAt);
  }, [badges]);

  return (
    <div>
      <div class="section__head">
        <h2 class="section__title">{STRINGS.parent.overview.title}</h2>
        <div class="range-pills" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r.id}
              class={`range-pills__btn ${rangeId === r.id ? 'is-active' : ''}`}
              onClick={() => setRangeId(r.id)}
              role="tab"
              aria-selected={rangeId === r.id}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-card__num">{totalCards}</div>
          <div class="summary-card__label">{STRINGS.parent.overview.summary.cards}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__num">{totalSessions}</div>
          <div class="summary-card__label">{STRINGS.parent.overview.summary.sessions}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__num">{accuracy}%</div>
          <div class="summary-card__label">{STRINGS.parent.overview.summary.accuracy}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__num">{streak}</div>
          <div class="summary-card__label">{STRINGS.parent.overview.summary.streak}</div>
        </div>
      </div>

      {totalCards === 0 ? (
        <div class="section">
          <div class="empty">
            <div class="emoji">📊</div>
            <p>{STRINGS.parent.overview.noData}</p>
          </div>
        </div>
      ) : (
        <div class="metrics-grid">
          <div class="metric">
            <h3>📈 {STRINGS.parent.overview.charts.daily}</h3>
            <LineChart
              data={{
                labels: dailyLabels,
                datasets: [{ label: 'Cards', data: dailyData, color: colors.primary, fill: true }]
              }}
            />
          </div>

          <div class="metric">
            <h3>⏱️ {STRINGS.parent.overview.charts.duration}</h3>
            <BarChart
              data={{
                labels: dailyLabels,
                datasets: [{ label: 'Minutes', data: durationData, color: colors.secondary }]
              }}
            />
          </div>

          <div class="metric">
            <h3>🎯 {STRINGS.parent.overview.charts.accuracy}</h3>
            {accuracyByDate.every((v) => v === null) ? (
              <div class="text-soft" style={{ padding: '12px' }}>
                {STRINGS.parent.overview.charts.noAccuracy}
              </div>
            ) : (
              <LineChart
                data={{
                  labels: dailyLabels,
                  datasets: [
                    {
                      label: 'Accuracy %',
                      data: accuracyByDate.map((v) => v ?? 0),
                      color: colors.green
                    }
                  ]
                }}
                options={{
                  scales: { y: { suggestedMax: 100, ticks: { callback: (v) => v + '%' } } }
                }}
              />
            )}
          </div>

          <div class="metric">
            <h3>🍩 {STRINGS.parent.overview.charts.mastery}</h3>
            <DoughnutChart
              data={{
                labels: [
                  STRINGS.parent.overview.mastery.new,
                  STRINGS.parent.overview.mastery.learning,
                  STRINGS.parent.overview.mastery.mastered,
                  STRINGS.parent.overview.mastery.overdue
                ],
                datasets: [
                  {
                    data: [mastery.new, mastery.learning, mastery.mastered, mastery.overdue],
                    backgroundColor: [colors.primary, colors.accent, colors.green, colors.orange]
                  }
                ]
              }}
            />
          </div>

          <div class="metric" style={{ gridColumn: '1 / -1' }}>
            <h3>📅 {STRINGS.parent.overview.charts.streak}</h3>
            <p class="text-soft" style={{ fontSize: '0.9rem' }}>
              {STRINGS.parent.overview.charts.streakSub}
            </p>
            <div class="metric__chart--heatmap">
              <Heatmap sessions={sessions} days={84} />
            </div>
          </div>

          <div class="metric" style={{ gridColumn: '1 / -1' }}>
            <h3>💪 {STRINGS.parent.overview.charts.hardest}</h3>
            {hardest.length === 0 ? (
              <div class="text-soft" style={{ padding: '12px' }}>
                No missed cards yet — great!
              </div>
            ) : (
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>{STRINGS.parent.overview.table.prompt}</th>
                      <th>{STRINGS.parent.overview.table.deck}</th>
                      <th>{STRINGS.parent.overview.table.lapses}</th>
                      <th>{STRINGS.parent.overview.table.interval}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardest.map((h) => (
                      <tr key={h.cardId}>
                        <td>{h.prompt}</td>
                        <td>{h.deckName}</td>
                        <td>{h.lapses}</td>
                        <td>{h.interval}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="metric" style={{ gridColumn: '1 / -1' }}>
            <h3>🏅 {STRINGS.parent.overview.charts.badges}</h3>
            {earnedBadges.length === 0 ? (
              <div class="text-soft" style={{ padding: '12px' }}>
                No badges earned yet.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {earnedBadges.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <span style={{ fontSize: '1.6rem' }}>{b.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{b.name}</div>
                    </div>
                    <div class="text-soft" style={{ fontSize: '0.85rem' }}>
                      {new Date(b.earnedAt).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function computeMastery(srsList, now = Date.now()) {
  let n = 0,
    l = 0,
    m = 0,
    o = 0;
  for (const s of srsList) {
    if (!s.lastReviewed && !s.reps) {
      n++;
      continue;
    }
    if (s.due < now - DAY_MS) {
      o++;
      continue;
    }
    if (s.interval >= 7) m++;
    else l++;
  }
  return { new: n, learning: l, mastered: m, overdue: o };
}

function calcStreak(allSessions) {
  if (!allSessions.length) return 0;
  const completed = allSessions.filter((s) => s.completedAt && !s.abandoned);
  if (!completed.length) return 0;
  const dates = new Set(completed.map((s) => s.date));
  const today = startOfDay(Date.now());
  let cursor = dates.has(today) ? today : today - DAY_MS;
  if (!dates.has(todayIso(new Date(cursor)))) return 0;
  let streak = 0;
  while (dates.has(todayIso(new Date(cursor)))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}
