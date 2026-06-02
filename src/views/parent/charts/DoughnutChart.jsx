import { useEffect, useRef } from 'preact/hooks';
import { ensureChartRegistered, palette } from './setup.js';
import { Chart } from 'chart.js';

export function DoughnutChart({ data, options = {}, height = 220, className = '' }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    ensureChartRegistered();
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        ...data,
        datasets: (data.datasets || []).map((ds) => ({
          backgroundColor: ds.backgroundColor || palette(ds.data?.length || 4),
          borderColor: '#fff',
          borderWidth: 3,
          ...ds
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: { backgroundColor: '#3a2d4f', padding: 10, cornerRadius: 8 }
        },
        ...options
      }
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [JSON.stringify(data)]);
  return (
    <div class={`metric__chart ${className}`} style={{ height: `${height}px` }}>
      <canvas ref={ref} />
    </div>
  );
}
