import { useEffect, useRef } from 'react';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

type ChartPoint = {
  label: string;
  kcal: number;
  water: number;
  hasKcal: boolean;
  hasWater: boolean;
  isAnchor?: boolean;
};

export default function TodayCombinedChart({ points }: { points: ChartPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const hasData = points.some((point) => point.kcal > 0 || point.water > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: '热量 kcal',
            data: points.map((point) => point.isAnchor || point.hasKcal ? point.kcal : null),
            borderColor: '#2e8b8b',
            backgroundColor: 'rgba(111,142,119,0.14)',
            borderWidth: 2,
            fill: true,
            tension: 0.38,
            pointRadius: points.map((point) => point.isAnchor && !hasData ? 0 : 3),
            spanGaps: true,
            yAxisID: 'kcal'
          },
          {
            label: '饮水 ml',
            data: points.map((point) => point.isAnchor || point.hasWater ? point.water : null),
            borderColor: '#e5a04f',
            backgroundColor: 'rgba(229,160,79,0.10)',
            borderWidth: 2,
            fill: false,
            tension: 0.38,
            pointRadius: points.map((point) => point.isAnchor && !hasData ? 0 : 3),
            spanGaps: true,
            yAxisID: 'water'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: '#4a5860',
              usePointStyle: true
            }
          },
          tooltip: { backgroundColor: '#344338', padding: 12 }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#8a949b',
              maxRotation: 0,
              autoSkip: true,
              includeBounds: true,
              maxTicksLimit: 9
            }
          },
          kcal: {
            beginAtZero: true,
            grid: { color: 'rgba(125,134,123,0.14)' },
            ticks: { color: '#2e8b8b', callback: (value) => `${value} kcal` }
          },
          water: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#d18a3f', callback: (value) => `${value} ml` }
          }
        }
      }
    });

    return () => chartRef.current?.destroy();
  }, [points, hasData]);

  return (
    <div className="relative h-[260px]">
      <canvas ref={canvasRef} />
      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#a8b1b6]">
          还没有记录
        </div>
      )}
    </div>
  );
}
