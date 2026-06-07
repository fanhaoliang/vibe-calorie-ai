import { useMemo } from 'react';
import { ChartLineUp, CalendarBlank } from '@phosphor-icons/react';
import Flatpickr from 'react-flatpickr';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';
import 'flatpickr/dist/themes/material_green.css';
import TodayCombinedChart from './TodayCombinedChart';
import RangeTrendChart from './RangeTrendChart';
import WeightTrendChart from './WeightTrendChart';
import { ChartPoint } from '../types';
import type { Summary } from '../types';
import type { WeightPoint } from '../hooks/useRangeData';

export type TrendView = 'diet' | 'weight';
export type TrendRange = 'day' | '7d' | '30d' | 'custom';

const VIEW_LABELS: Record<TrendView, string> = {
  diet: '饮食',
  weight: '体重'
};

const RANGE_LABELS: Record<TrendRange, string> = {
  day: '当日',
  '7d': '7天',
  '30d': '30天',
  custom: '自定义'
};

interface TrendSectionProps {
  view: TrendView;
  range: TrendRange;
  onViewChange: (view: TrendView) => void;
  onRangeChange: (range: TrendRange) => void;
  customRange: [string, string] | null;
  onCustomRangeChange: (range: [string, string] | null) => void;
  loading: boolean;
  todayPoints: ChartPoint[];
  summary: { totalCalories: number; waterTotalMl: number };
  rangeData: Summary[];
  rangeLoading: boolean;
  weightData: WeightPoint[];
  weightLoading: boolean;
}

function formatDatePick(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[18px] px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-[#6f8e77] text-white shadow-sm'
          : 'text-[#5f7b66] hover:bg-[#e8ede2]'
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

export default function TrendSection({
  view,
  range,
  onViewChange,
  onRangeChange,
  customRange,
  onCustomRangeChange,
  loading,
  todayPoints,
  summary,
  rangeData,
  rangeLoading,
  weightData,
  weightLoading
}: TrendSectionProps) {
  const isDay = range === 'day';
  const isCustom = range === 'custom';
  const isWeight = view === 'weight';

  const totalCalories = useMemo(() => {
    if (isDay) return summary.totalCalories;
    return rangeData.reduce((sum, d) => sum + d.totalCalories, 0);
  }, [isDay, summary.totalCalories, rangeData]);

  const waterTotalMl = useMemo(() => {
    if (isDay) return summary.waterTotalMl;
    return rangeData.reduce((sum, d) => sum + d.waterTotalMl, 0);
  }, [isDay, summary.waterTotalMl, rangeData]);

  const avgWeight = useMemo(() => {
    if (!isWeight) return null;
    const valid = weightData.filter((d) => d.weightKg != null);
    if (valid.length === 0) return null;
    return valid.reduce((sum, d) => sum + (d.weightKg ?? 0), 0) / valid.length;
  }, [isWeight, weightData]);

  const latestWeight = useMemo(() => {
    if (!isWeight) return null;
    for (let i = weightData.length - 1; i >= 0; i--) {
      if (weightData[i].weightKg != null) return weightData[i].weightKg;
    }
    return null;
  }, [isWeight, weightData]);

  const rangeLabel = useMemo(() => {
    if (!isWeight && isDay) return '08:30-20:30 固定时间轴';
    const data = isWeight ? weightData : rangeData;
    if (data.length === 0) return '加载中...';
    const first = data[0]?.date ?? '';
    const last = data[data.length - 1]?.date ?? '';
    if (!first || !last) return '';
    return `${first.slice(5)} ~ ${last.slice(5)}`;
  }, [isWeight, isDay, rangeData, weightData]);

  const chartLoading = isDay && !isWeight ? loading : isWeight ? weightLoading : rangeLoading;

  return (
    <section className="mt-4 rounded-[34px] border border-[#e8dfd2] bg-white/82 p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm text-[#6f8e77]">
          <ChartLineUp size={18} weight="duotone" />
          <span>趋势</span>
        </div>
        <div className="flex items-center gap-1 rounded-[22px] border border-[#dfe6d7] bg-[#f4f7ed] p-1">
          {(Object.keys(VIEW_LABELS) as TrendView[]).map((v) => (
            <Pill key={v} active={view === v} onClick={() => onViewChange(v)}>
              {VIEW_LABELS[v]}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {(Object.keys(RANGE_LABELS) as TrendRange[]).map((r) => (
          <Pill key={r} active={range === r} onClick={() => onRangeChange(r)}>
            {RANGE_LABELS[r]}
          </Pill>
        ))}
      </div>

      {isCustom && (
        <div className="mb-3 flex items-center gap-2">
          <CalendarBlank size={16} weight="duotone" className="text-[#6f8e77]" />
          <Flatpickr
            className="w-[220px] rounded-[14px] border border-[#dfe6d7] bg-white px-3 py-2 text-sm text-[#2f342f] outline-none focus:border-[#6f8e77]"
            value={
              customRange
                ? [new Date(`${customRange[0]}T00:00:00`), new Date(`${customRange[1]}T00:00:00`)]
                : undefined
            }
            options={{
              mode: 'range',
              dateFormat: 'Y/m/d',
              locale: Mandarin
            }}
            onChange={(dates: Date[]) => {
              if (dates.length === 2) {
                const start = formatDatePick(dates[0]);
                const end = formatDatePick(dates[1]);
                onCustomRangeChange([start, end]);
              }
            }}
          />
        </div>
      )}

      <section className="rounded-[28px] border border-[#eadfce] bg-[#fbf8f1] p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            {isWeight ? (
              <>
                <div>
                  <p className="text-sm text-[#6f8e77]">区间均重</p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-2xl font-semibold text-[#303b33]">
                      {avgWeight != null ? avgWeight.toFixed(1) : '--'}
                    </strong>
                    <span className="pb-1 text-sm text-[#7d8279]">kg</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#d18a3f]">最新体重</p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-2xl font-semibold text-[#303b33]">
                      {latestWeight != null ? latestWeight.toFixed(1) : '--'}
                    </strong>
                    <span className="pb-1 text-sm text-[#7d8279]">kg</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-[#6f8e77]">
                    {isDay ? '热量记录点' : '区间热量'}
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-2xl font-semibold text-[#303b33]">{totalCalories}</strong>
                    <span className="pb-1 text-sm text-[#7d8279]">kcal</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#d18a3f]">
                    {isDay ? '饮水记录点' : '区间饮水'}
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-2xl font-semibold text-[#303b33]">{waterTotalMl}</strong>
                    <span className="pb-1 text-sm text-[#7d8279]">ml</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7d8279]">{rangeLabel}</span>
        </div>
        {chartLoading ? (
          <div className="h-[260px] animate-pulse rounded-[26px] bg-[#f1eadf]" />
        ) : isWeight ? (
          <WeightTrendChart points={weightData} />
        ) : isDay ? (
          <TodayCombinedChart points={todayPoints} />
        ) : (
          <RangeTrendChart points={rangeData} />
        )}
      </section>
    </section>
  );
}
