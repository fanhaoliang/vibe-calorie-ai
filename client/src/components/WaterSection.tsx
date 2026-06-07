import { FormEvent } from 'react';
import { Drop, Trash } from '@phosphor-icons/react';
import { formatTime } from '../utils';
import type { WaterEntry } from '../types';

interface WaterSectionProps {
  summary: { waterTotalMl: number; waterEntryCount: number };
  bodyMetrics: { waterTargetMl: number };
  waters: WaterEntry[];
  waterAmount: string;
  submitting: boolean;
  waterProgress: number;
  onQuickWater: (amount: number) => void;
  onWaterAmountChange: (value: string) => void;
  onSubmitWater: (event: FormEvent) => void;
  onDeleteWater: (id: number) => void;
  toneForWater: string;
}

export default function WaterSection({
  summary,
  bodyMetrics,
  waters,
  waterAmount,
  submitting,
  waterProgress,
  onQuickWater,
  onWaterAmountChange,
  onSubmitWater,
  onDeleteWater,
  toneForWater
}: WaterSectionProps) {
  const recentWaters = waters.slice(0, 4);
  const hiddenWaterCount = Math.max(0, waters.length - recentWaters.length);

  return (
    <section className="mt-4 rounded-[34px] border border-[#e8dfd2] bg-white/82 p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-[#d18a3f]">
            <Drop size={18} weight="duotone" />
            <span>饮水进度</span>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-4xl font-semibold leading-none text-[#303b33]">{summary.waterTotalMl}</h2>
            <span className="pb-1 text-base text-[#7d8279]">ml</span>
            <span className="pb-1 text-sm text-[#7d8279]">/ {bodyMetrics.waterTargetMl} ml</span>
          </div>
          <p className="mt-2 text-sm text-[#687066]">{toneForWater}</p>
        </div>
        <div className="rounded-[22px] bg-[#f8f0e3] px-4 py-3 text-right">
          <p className="text-xs text-[#9a6b31]">完成度</p>
          <strong className="text-2xl font-semibold text-[#303b33]">{waterProgress}%</strong>
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#efe5d6]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${summary.waterTotalMl >= bodyMetrics.waterTargetMl ? 'from-[#7f9b86] to-[#5d7f69]' : 'from-[#eab15f] to-[#d88a3f]'}`}
          style={{ width: `${waterProgress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.15fr)]">
        <div>
          <p className="mb-2 text-xs font-medium text-[#7d8279]">快速加水</p>
          <div className="grid grid-cols-3 gap-2">
            {[200, 300, 500].map((amount) => (
              <button key={amount} className="rounded-2xl border border-[#e5a04f] bg-[#fff4e2] px-3 py-3 text-sm font-semibold text-[#8a4f14] shadow-[0_10px_24px_rgba(229,160,79,0.18)] transition hover:border-[#d88a3f] hover:bg-[#ffe9c4] active:translate-y-px" onClick={() => void onQuickWater(amount)} type="button">
                +{amount}ml
              </button>
            ))}
          </div>
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onSubmitWater}>
            <input
              className="min-w-0 rounded-2xl border border-[#dfd1bc] bg-white px-4 py-3 text-sm outline-none focus:border-[#d89a4b] focus:ring-4 focus:ring-[#f0dfc6]"
              min="1"
              max="3000"
              type="number"
              placeholder="自定义 ml"
              value={waterAmount}
              onChange={(event) => onWaterAmountChange(event.target.value)}
            />
            <button className="rounded-2xl bg-[#e5a04f] px-5 py-3 text-sm font-medium text-[#342719] transition hover:bg-[#d89447] active:translate-y-px" type="submit">
              加水
            </button>
          </form>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-[#7d8279]">最近 4 条</p>
            <span className="text-xs text-[#9a6b31]">{hiddenWaterCount ? `另有 ${hiddenWaterCount} 条` : `${waters.length} 条`}</span>
          </div>
          <div className="grid min-h-[72px] grid-cols-2 gap-2 overflow-hidden">
            {recentWaters.map((water) => (
              <div key={water.id} className="flex min-h-[46px] items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fbf8f1] px-3 py-2 text-sm">
                <span className="text-[#8a5b24]">{formatTime(water.recordedAt)} · {water.amountMl} ml</span>
                <button className="rounded-full p-2 text-[#9b6b5c] transition hover:bg-[#fff3ef] active:translate-y-px" onClick={() => void onDeleteWater(water.id)} title="删除饮水记录" type="button">
                  <Trash size={16} weight="duotone" />
                </button>
              </div>
            ))}
            {!waters.length && (
              <div className="col-span-2 flex min-h-[70px] items-center justify-center rounded-2xl border border-dashed border-[#d9cebd] bg-[#fbf8f1]/70 px-6 py-5 text-center text-sm text-[#7d8279]">
                先喝一杯水，给今天开个舒服的头。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
