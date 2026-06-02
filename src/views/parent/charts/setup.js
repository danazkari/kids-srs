// Chart.js v4 helpers. We register components once at module load.
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { cssVar } from '../../../theme.js';

let _registered = false;
export function ensureChartRegistered() {
  if (_registered) return;
  Chart.register(
    LineController, BarController, DoughnutController,
    LineElement, PointElement, BarElement, ArcElement,
    CategoryScale, LinearScale, TimeScale,
    Tooltip, Legend, Filler
  );
  Chart.defaults.font.family = cssVar('--font-base') || 'Comic Relief, system-ui, sans-serif';
  Chart.defaults.color = cssVar('--text') || '#3a2d4f';
  Chart.defaults.borderColor = cssVar('--border') || '#efe6f5';
  _registered = true;
}

// Read named theme colors so charts follow the current accent + theme.
export function themePalette() {
  return [
    cssVar('--primary'),
    cssVar('--secondary'),
    cssVar('--accent'),
    cssVar('--green'),
    cssVar('--purple'),
    cssVar('--orange')
  ].filter(Boolean);
}

export function palette(n) {
  const colors = themePalette();
  if (!colors.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(colors[i % colors.length]);
  return out;
}
