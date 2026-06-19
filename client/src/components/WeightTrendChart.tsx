import { useEffect, useRef, useMemo } from 'react';
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
import type { WeightPoint } from '../hooks/useRangeData';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

function fillMissingWeights(points: WeightPoint[]): { date: string; weightKg: number; isReal: boolean }[] {
  if (points.length === 0) return [];

  const filled: { date: string; weightKg: number; isReal: boolean }[] = [];
  let lastReal: number | null = null;

  // 先正序遍历，用前一天的真实值填充
  for (const p of points) {
    if (p.weightKg != null) {
      lastReal = p.weightKg;
      filled.push({ date: p.date, weightKg: p.weightKg, isReal: true });
    } else if (lastReal != null) {
      filled.push({ date: p.date, weightKg: lastReal, isReal: false });
    } else {
      filled.push({ date: p.date, weightKg: NaN, isReal: false });
    }
  }

  // 头部还有 NaN 的，找后续所有真实值的平均值，再没就给 0
  const validValues = points.map((p) => p.weightKg).filter((v): v is number => v != null);
  const fallbackAvg = validValues.length > 0
    ? validValues.reduce((a, b) => a + b, 0) / validValues.length
    : 0;

  for (let i = 0; i < filled.length; i++) {
    if (Number.isNaN(filled[i].weightKg)) {
      filled[i].weightKg = fallbackAvg;
    }
  }

  return filled;
}

export default function WeightTrendChart({ points }: { points: WeightPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const filled = useMemo(() => fillMissingWeights(points), [points]);
  const hasAnyData = filled.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();

    const realData = filled.map((p) => (p.isReal ? p.weightKg : null));
    const filledData = filled.map((p) => p.weightKg);
    const pointStyles = filled.map((p) => (p.isReal ? 'circle' : 'rectRot'));
    const pointRadii = filled.map((p) => (p.isReal ? 3 : 2));

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: filled.map((p) => p.date.slice(5)),
        datasets: [
          {
            label: '体重 kg',
            data: filledData,
            borderColor: '#2e8b8b',
            backgroundColor: 'rgba(111,142,119,0.14)',
            borderWidth: 2,
            borderDash: [4, 4],
            fill: true,
            tension: 0.35,
            pointRadius: pointRadii,
            pointStyle: pointStyles,
            pointHoverRadius: 5
          },
          {
            label: '实测体重 kg',
            data: realData,
            borderColor: '#2e8b8b',
            backgroundColor: '#2e8b8b',
            borderWidth: 2,
            fill: false,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: false
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
              title(context) {
                const idx = context[0].dataIndex;
                return filled[idx]?.date ?? '';
              },
              label(context) {
                const idx = context.dataIndex;
                const isReal = filled[idx]?.isReal ?? false;
                const value = Number(context.parsed.y);
                return `${isReal ? '体重' : '估算体重'}: ${value.toFixed(1)} kg`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#8a949b',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 9
            }
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(125,134,123,0.14)' },
            ticks: {
              color: '#2e8b8b',
              callback: (value) => `${Number(value).toFixed(1)} kg`
            }
          }
        }
      }
    });

    return () => chartRef.current?.destroy();
  }, [filled]);

  return (
    <div className="relative h-[260px]">
      <canvas ref={canvasRef} />
      {!hasAnyData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#8a949b]">
          选择时间范围后，体重趋势会在这里呈现。
        </div>
      )}
    </div>
  );
}
