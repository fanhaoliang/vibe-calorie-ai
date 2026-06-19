import { useEffect, useState } from 'react';
import { CalendarBlank, Leaf, ArrowCounterClockwise } from '@phosphor-icons/react';
import Flatpickr from 'react-flatpickr';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';
import 'flatpickr/dist/themes/material_green.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// 仅用于显示的当前时间 tick；与业务态 selectedDateTime 互不干扰。
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface HeaderProps {
  selectedDateTime: Date;
  submitting: boolean;
  onDateChange: (date: Date) => void;
  onReset: () => void;
}

export default function Header({ selectedDateTime, submitting, onDateChange, onReset }: HeaderProps) {
  const now = useNow();
  const isToday = isSameDay(selectedDateTime, now);
  // 当查看的是今天 → 显示真实当下时间（每秒滚动）
  // 否则 → 显示用户选的那一刻
  const display = isToday ? now : selectedDateTime;
  const month = pad(display.getMonth() + 1);
  const day = pad(display.getDate());
  const weekday = WEEKDAYS[display.getDay()];
  const hh = pad(display.getHours());
  const mm = pad(display.getMinutes());
  const ss = pad(display.getSeconds());

  return (
    <header className="glass-card mb-5 flex flex-col gap-4 rounded-[34px] p-5 shadow-[0_24px_80px_rgba(74,88,69,0.10)] md:flex-row md:items-center md:justify-between">
      <div>
        <div className="glow-on-hover mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe2df] bg-gradient-to-r from-[#e9f3f1] to-[#dceae8] px-3 py-1 text-sm text-[#2e8b8b]">
          <Leaf size={16} weight="duotone" />
          <span>今日轻记录</span>
        </div>
        <h1 className="bg-gradient-to-r from-[#1d2a30] via-[#274a48] to-[#1f6b6b] bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-4xl">饮食与体重，记一笔就好</h1>
      </div>
      <div className="flex items-stretch">
        <div className="clock-cluster">
          <div className="clock-card">
            <Flatpickr
              className="clock-card__input"
              value={selectedDateTime}
              options={{
                enableTime: true,
                enableSeconds: true,
                time_24hr: true,
                dateFormat: 'Y/m/d H:i:S',
                locale: Mandarin
              }}
              onChange={(dates: Date[]) => {
                const next = dates[0];
                if (!next) return;
                onDateChange(next);
              }}
            />
            <div className="clock-card__face">
              <div className="clock-card__head">
                <CalendarBlank size={14} weight="duotone" />
                <span className="clock-card__date">{month}.{day}</span>
                <span className="clock-card__weekday">周{weekday}</span>
                {isToday ? (
                  <span className="clock-card__badge">
                    <span className="clock-card__live-dot" />Live
                  </span>
                ) : (
                  <span className="clock-card__badge clock-card__badge--past">历史</span>
                )}
              </div>
              <div className="clock-card__time">
                <span>{hh}</span>
                <span className="clock-colon">:</span>
                <span>{mm}</span>
                <span className="clock-colon">:</span>
                <span>{ss}</span>
              </div>
            </div>
          </div>
          <button
            className="reset-btn"
            disabled={submitting}
            onClick={() => void onReset()}
            type="button"
            title="清空所有数据"
            aria-label="清空所有数据"
          >
            <ArrowCounterClockwise size={20} weight="bold" />
          </button>
        </div>
      </div>
    </header>
  );
}
