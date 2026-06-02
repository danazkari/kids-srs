import { useEffect, useRef } from 'preact/hooks';
import { ensureChartRegistered, palette } from './setup.js';
import { Chart } from 'chart.js';

export function LineChart({ data, options = {}, height = 220, className = '' }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    ensureChartRegistered();
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        ...data,
        datasets: (data.datasets || []).map((ds, i) => ({
          borderColor: ds.color || palette(8)[i],
          backgroundColor: ds.fill ? (ds.fillColor || (ds.color || palette(8)[i]) + '33') : 'transparent',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: !!ds.fill,
          ...ds
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: data.datasets?.length > 1, position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: { backgroundColor: '#3a2d4f', padding: 10, cornerRadius: 8 }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#efe6f5' } },
          x: { grid: { display: false } }
        },
        ...options
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [JSON.stringify(data)]);
  return (
    <div class={`metric__chart ${className}`} style={{ height: `${height}px` }}>
      <canvas ref={ref} />
    </div>
  );
}
