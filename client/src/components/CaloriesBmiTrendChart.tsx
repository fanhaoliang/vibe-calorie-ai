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

type BmiTrendPoint = {
  date: string;
  calories: number | null;
  bmi: number;
  isOutlier: boolean;
};

export default function CaloriesBmiTrendChart({ points }: { points: BmiTrendPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((point) => point.date.slice(5)),
        datasets: [
          {
            label: '热量 kcal',
            data: points.map((point) => point.calories),
            borderColor: '#2e8b8b',
            backgroundColor: 'rgba(111,142,119,0.14)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'calories'
          },
          {
            label: 'BMI',
            data: points.map((point) => point.bmi),
            borderColor: '#e5a04f',
            backgroundColor: 'rgba(229,160,79,0.08)',
            fill: false,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'bmi'
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
          tooltip: {
            backgroundColor: '#344338',
            padding: 12,
            callbacks: {
              label(context) {
                const value = Number(context.parsed.y);
                return context.datasetIndex === 0
                  ? `热量: ${Math.round(value)} kcal`
                  : `BMI: ${value.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8a949b' } },
          calories: {
            beginAtZero: true,
            grid: { color: 'rgba(125,134,123,0.12)' },
            ticks: {
              color: '#2e8b8b',
              callback: (value) => `${value} kcal`
            }
          },
          bmi: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#d18a3f',
              callback: (value) => Number(value).toFixed(1)
            }
          }
        }
      }
    });

    return () => chartRef.current?.destroy();
  }, [points]);

  return (
    <div className="h-[260px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
