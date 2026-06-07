import { ChartLineUp } from '@phosphor-icons/react';
import TodayCombinedChart from './TodayCombinedChart';
import { ChartPoint } from '../types';

interface TrendSectionProps {
  loading: boolean;
  todayPoints: ChartPoint[];
  summary: { totalCalories: number; waterTotalMl: number };
}

export default function TrendSection({
  loading,
  todayPoints,
  summary
}: TrendSectionProps) {
  return (
    <section className="mt-4 rounded-[34px] border border-[#e8dfd2] bg-white/82 p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]">
      <div className="mb-3">
        <div className="inline-flex items-center gap-2 text-sm text-[#6f8e77]">
          <ChartLineUp size={18} weight="duotone" />
          <span>当日趋势</span>
        </div>
      </div>
      <section className="rounded-[28px] border border-[#eadfce] bg-[#fbf8f1] p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div>
              <p className="text-sm text-[#6f8e77]">热量记录点</p>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-2xl font-semibold text-[#303b33]">{summary.totalCalories}</strong>
                <span className="pb-1 text-sm text-[#7d8279]">kcal</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#d18a3f]">饮水记录点</p>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-2xl font-semibold text-[#303b33]">{summary.waterTotalMl}</strong>
                <span className="pb-1 text-sm text-[#7d8279]">ml</span>
              </div>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7d8279]">08:30-20:30 固定时间轴</span>
        </div>
        {loading ? (
          <div className="h-[260px] animate-pulse rounded-[26px] bg-[#f1eadf]" />
        ) : (
          <TodayCombinedChart points={todayPoints} />
        )}
      </section>
    </section>
  );
}
