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
    <section className={`rounded-[34px] border shadow-[0_22px_60px_rgba(79,92,72,0.10)] backdrop-blur ${isCalorieWarning ? 'border-[#df8a7a] bg-[#fff7f4]' : 'border-[#e8dfd2]/90 bg-white/78'}`}>
      <div className="grid min-h-full divide-y divide-[#e8dfd2] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:divide-x lg:divide-y-0">
        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#7d8279]">今日摄入</p>
              <span className="mt-2 inline-flex rounded-full bg-[#f4f7ed] px-3 py-1 text-xs font-medium text-[#5f7b66]">温和减脂目标</span>
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <h2 className={`text-4xl font-semibold leading-none ${isCalorieWarning ? 'text-[#8d352d]' : 'text-[#2f3b33]'}`}>{summary.totalCalories}</h2>
                <span className="pb-1 text-sm text-[#7d8279]">kcal</span>
              </div>
            </div>
            <div className={`rounded-2xl bg-gradient-to-br ${isCalorieWarning ? 'from-[#d95745] to-[#a93a31]' : 'from-[#7f9b86] to-[#5d7f69]'} p-3 text-white shadow-[0_14px_28px_rgba(93,127,105,0.18)]`}>
              <ForkKnife size={25} weight="duotone" />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-[#7d8279]">
              <span>{isCalorieWarning ? `超出 ${calorieOverBy} kcal` : `目标 ${calorieTarget} kcal`}</span>
              <span>{calorieRatio}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#ebe3d6]">
              <div className={`h-full rounded-full bg-gradient-to-r ${isCalorieWarning ? 'from-[#d95745] to-[#a93a31]' : 'from-[#7f9b86] to-[#5d7f69]'}`} style={{ width: `${calorieProgress}%` }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee5d8] pt-4">
            <div>
              <p className="text-xs text-[#7d8279]">记录次数</p>
              <p className="mt-1 text-2xl font-semibold text-[#303b33]">{recordCount}<span className="ml-1 text-sm font-normal text-[#7d8279]">次</span></p>
            </div>
            <div className="flex gap-2 text-xs text-[#687066]">
              <span className="rounded-full bg-[#f5f0e7] px-3 py-1">{summary.foodEntryCount} 条饮食</span>
              <span className="rounded-full bg-[#f5f0e7] px-3 py-1">{summary.waterEntryCount} 条饮水</span>
            </div>
          </div>

          <p className={`mt-4 text-sm leading-5 ${isCalorieWarning ? 'text-[#8d352d]' : 'text-[#596159]'}`}>{toneForCalories}</p>
        </div>

        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#7d8279]">身体记录</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <h2 className="text-4xl font-semibold leading-none text-[#2f3b33]">{weightKg.toFixed(1)}</h2>
                <span className="pb-1 text-sm text-[#7d8279]">kg</span>
              </div>
              <p className="mt-1 text-sm text-[#7d8279]">BMI {bodyMetrics.bmi.toFixed(1)} · 身高 {PERSON_HEIGHT_CM} cm</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#8a948d] to-[#657168] p-3 text-white shadow-[0_14px_28px_rgba(93,127,105,0.18)]">
              <TrendUp size={25} weight="duotone" />
            </div>
          </div>

          <form className="mt-5 grid gap-2" onSubmit={onSaveWeight}>
            <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#dfd6c8] bg-[#fbf8f1] px-4 py-3 text-sm text-[#596159]">
              <span className="shrink-0 text-[#7d8279]">体重</span>
              <input
                className="min-w-0 bg-transparent text-right text-base font-semibold text-[#303b33] outline-none"
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
              <span className="shrink-0 text-[#7d8279]">kg</span>
            </label>
            <button className="rounded-2xl bg-[#344338] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2c392f] active:translate-y-px" type="submit">
              保存
            </button>
          </form>

          <p className="mt-4 text-sm leading-5 text-[#596159]">
            {summary.weightRecordedAt ? `最近记录：${summary.weightRecordedAt.slice(0, 10)}` : '今天体重多少？记一下就能看到更准的趋势。'}
          </p>
        </div>
      </div>
    </section>
  );
}
