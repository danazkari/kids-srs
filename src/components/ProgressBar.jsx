export function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax={max} aria-valuenow={value} aria-label={label || 'progress'}>
      <div class="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
