import { FormEvent } from 'react';
import { ForkKnife, TrendUp } from '@phosphor-icons/react';
import StatCard from './StatCard';
import type { Summary } from '../types';

interface DashboardProps {
  summary: Summary;
  weightKg: number;
  calorieTarget: number;
  calorieProgress: number;
  calorieRatio: number;
  calorieOverBy: number;
  isCalorieWarning: boolean;
  bodyMetrics: { bmi: number; waterTargetMl: number; bodyCoefficient: number };
  recordCount: number;
  toneForCalories: string;
  onSaveWeight: (event: FormEvent) => void;
  onWeightChange: (weight: number) => void;
}

export default function Dashboard({
  summary,
  weightKg,
  calorieTarget,
  calorieProgress,
  calorieRatio,
  calorieOverBy,
  isCalorieWarning,
  bodyMetrics,
  recordCount,
  toneForCalories,
  onSaveWeight,
  onWeightChange
}: DashboardProps) {
  const PERSON_HEIGHT_CM = 165;

  return (
    <section className={`glass-card rounded-[34px] shadow-[0_22px_60px_rgba(79,92,72,0.10)] ${isCalorieWarning ? 'warn-pulse !border-[#c14b6e] bg-[#fbeef2]/80' : ''}`}>
      <div className="grid min-h-full divide-y divide-[#dde3e3] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:divide-x lg:divide-y-0">
        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#8a949b]">今日摄入</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <h2 className={`text-4xl font-semibold leading-none ${isCalorieWarning ? 'text-[#8b2745]' : 'text-[#1d2a30]'}`}>{summary.totalCalories}</h2>
                <span className="pb-1 text-sm text-[#8a949b]">kcal</span>
              </div>
            </div>
            <div className={`rounded-2xl bg-gradient-to-br ${isCalorieWarning ? 'from-[#d95745] to-[#a93a31]' : 'from-[#3aa39e] to-[#1f6b6b]'} p-3 text-white shadow-[0_14px_28px_rgba(93,127,105,0.18)]`}>
              <ForkKnife size={25} weight="duotone" />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-[#8a949b]">
              <span>{isCalorieWarning ? `超出 ${calorieOverBy} kcal` : `目标 ${calorieTarget} kcal`}</span>
              <span>{calorieRatio}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e1e7e8]">
              <div className={`progress-shimmer h-full rounded-full bg-gradient-to-r ${isCalorieWarning ? 'from-[#d95745] to-[#a93a31]' : 'from-[#3aa39e] to-[#1f6b6b]'}`} style={{ width: `${calorieProgress}%` }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#dde3e3] pt-4">
            <div>
              <p className="text-xs text-[#8a949b]">记录次数</p>
              <p className="mt-1 text-2xl font-semibold text-[#1d2a30]">{recordCount}<span className="ml-1 text-sm font-normal text-[#8a949b]">次</span></p>
            </div>
            <div className="flex gap-2 text-xs text-[#4a5860]">
              <span className="rounded-full bg-[#eef3f3] px-3 py-1">{summary.foodEntryCount} 条饮食</span>
              <span className="rounded-full bg-[#eef3f3] px-3 py-1">{summary.waterEntryCount} 条饮水</span>
            </div>
          </div>

          <p className={`mt-4 text-sm leading-5 ${isCalorieWarning ? 'text-[#8b2745]' : 'text-[#4a5860]'}`}>{toneForCalories}</p>
        </div>

        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#8a949b]">身体记录</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <h2 className="text-4xl font-semibold leading-none text-[#1d2a30]">{weightKg.toFixed(1)}</h2>
                <span className="pb-1 text-sm text-[#8a949b]">kg</span>
              </div>
              <p className="mt-1 text-sm text-[#8a949b]">BMI {bodyMetrics.bmi.toFixed(1)} · 身高 {PERSON_HEIGHT_CM} cm</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#8a948d] to-[#657168] p-3 text-white shadow-[0_14px_28px_rgba(93,127,105,0.18)]">
              <TrendUp size={25} weight="duotone" />
            </div>
          </div>

          <form className="mt-5 grid gap-2" onSubmit={onSaveWeight}>
            <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#cdd6d6] bg-[#f4f6f6] px-4 py-3 text-sm text-[#4a5860]">
              <span className="shrink-0 text-[#8a949b]">体重</span>
              <input
                className="min-w-0 bg-transparent text-right text-base font-semibold text-[#1d2a30] outline-none"
                min="20"
                max="250"
                step="0.1"
                type="number"
                value={weightKg}
                onChange={(event) => {
                  const nextWeight = Number(event.target.value);
                  if (Number.isFinite(nextWeight) && nextWeight > 0) onWeightChange(nextWeight);
                }}
              />
              <span className="shrink-0 text-[#8a949b]">kg</span>
            </label>
            <button className="rounded-2xl bg-[#1f6b6b] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0f5454] active:translate-y-px" type="submit">
              保存
            </button>
          </form>

          <p className="mt-4 text-sm leading-5 text-[#4a5860]">
            {summary.weightRecordedAt ? `最近记录：${summary.weightRecordedAt.slice(0, 10)}` : '今天体重多少？记一下就能看到更准的趋势。'}
          </p>
        </div>
      </div>
    </section>
  );
}
