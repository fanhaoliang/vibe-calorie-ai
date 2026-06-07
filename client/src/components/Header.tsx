import { CalendarBlank, Leaf } from '@phosphor-icons/react';
import Flatpickr from 'react-flatpickr';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';
import 'flatpickr/dist/themes/material_green.css';

interface HeaderProps {
  selectedDateTime: Date;
  submitting: boolean;
  onDateChange: (date: Date) => void;
  onReset: () => void;
}

export default function Header({ selectedDateTime, submitting, onDateChange, onReset }: HeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-4 rounded-[34px] border border-white/70 bg-white/55 p-5 shadow-[0_24px_80px_rgba(74,88,69,0.10)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dfe6d7] bg-[#f4f7ed] px-3 py-1 text-sm text-[#5f7b66]">
          <Leaf size={16} weight="duotone" />
          <span>今日轻记录</span>
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-[#2f3b33] sm:text-4xl">把她发来的饮食，安静记成一天的节奏</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687066]">输入自然语言，系统会按选择的时间记录、估算热量，并把饮水单独汇总。未配置模型时会先用本地规则解析。</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-[26px] bg-[#344338] px-4 py-3 text-white shadow-[0_18px_40px_rgba(52,67,56,0.20)]">
          <CalendarBlank size={24} weight="duotone" />
          <div>
            <p className="text-xs text-white/65">查看日期时间</p>
            <Flatpickr
              className="mt-1 w-[190px] bg-transparent text-sm font-medium tracking-[0.01em] text-white outline-none placeholder:text-white/55"
              value={selectedDateTime}
              options={{
                enableTime: true,
                enableSeconds: true,
                time_24hr: true,
                dateFormat: 'Y/m/d H:i:S',
                locale: Mandarin
              }}
              onChange={(dates: Date[]) => {
                const nextDate = dates[0];
                if (!nextDate) return;
                onDateChange(nextDate);
              }}
            />
          </div>
        </div>
        <button
          className="inline-flex min-h-[54px] items-center justify-center rounded-[22px] border border-[#ead0c7] bg-[#fff7f4] px-5 text-sm font-medium text-[#9b4b3f] shadow-[0_14px_30px_rgba(159,75,63,0.08)] transition hover:border-[#dda99b] hover:bg-[#fff1ec] active:translate-y-px disabled:opacity-60"
          disabled={submitting}
          onClick={() => void onReset()}
          type="button"
        >
          从头再来
        </button>
      </div>
    </header>
  );
}
