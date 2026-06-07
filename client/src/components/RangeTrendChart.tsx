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

export type RangePoint = {
  date: string;
  totalCalories: number;
  waterTotalMl: number;
};

export default function RangeTrendChart({ points }: { points: RangePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const hasData = points.some((p) => p.totalCalories > 0 || p.waterTotalMl > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((p) => p.date.slice(5)),
        datasets: [
          {
            label: '热量 kcal',
            data: points.map((p) => p.totalCalories),
            borderColor: '#6f8e77',
            backgroundColor: 'rgba(111,142,119,0.14)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'kcal'
          },
          {
            label: '饮水 ml',
            data: points.map((p) => p.waterTotalMl),
            borderColor: '#e5a04f',
            backgroundColor: 'rgba(229,160,79,0.10)',
            borderWidth: 2,
            fill: false,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
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
              color: '#596159',
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#344338',
            padding: 12,
            callbacks: {
              title(context) {
                const idx = context[0].dataIndex;
                return points[idx]?.date ?? '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#8a8f86',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 9
            }
          },
          kcal: {
            beginAtZero: true,
            grid: { color: 'rgba(125,134,123,0.14)' },
            ticks: { color: '#6f8e77', callback: (value) => `${value} kcal` }
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
  }, [points]);

  return (
    <div className="relative h-[260px]">
      <canvas ref={canvasRef} />
      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#7d8279]">
          选择时间范围后，趋势曲线会在这里呈现。
        </div>
      )}
    </div>
  );
}
