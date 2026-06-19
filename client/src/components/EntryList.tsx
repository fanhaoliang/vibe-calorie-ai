import { Trash } from '@phosphor-icons/react';
import { formatTime, formatRelativeTime } from '../utils';
import type { FoodEntry } from '../types';

interface EntryListProps {
  entries: FoodEntry[];
  loading: boolean;
  showAllEntries: boolean;
  onToggleShowAll: () => void;
  onDeleteEntry: (id: number) => void;
}

export default function EntryList({
  entries,
  loading,
  showAllEntries,
  onToggleShowAll,
  onDeleteEntry
}: EntryListProps) {
  const visibleEntries = showAllEntries ? entries : entries.slice(0, 5);

  return (
    <section className="glass-card mt-4 rounded-[34px] p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d2a30]">今天的明细</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#e9f3f1] px-3 py-1 text-sm text-[#2e8b8b]">{entries.length} 条饮食</span>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {!loading && !entries.length && (
          <div className="rounded-[24px] border border-dashed border-[#cdd6d6] bg-[#f4f6f6]/70 px-4 py-8 text-center text-sm text-[#a8b1b6] lg:col-span-2">
            还没有记录
          </div>
        )}
        {visibleEntries.map((entry) => {
          const entryNeedsReview = entry.needReview || entry.foodItems.some((item) => item.needReview) || entry.waterItems.some((item) => item.needReview);
          return (
            <article key={entry.id} className={`fade-up flex flex-col rounded-[26px] border p-4 transition-all duration-300 hover:-translate-y-px hover:shadow-[0_18px_40px_rgba(79,92,72,0.10)] ${entryNeedsReview ? 'border-[#efc98a] bg-[#fff8eb] shadow-[0_16px_34px_rgba(154,107,49,0.10)]' : 'border-[#dde3e3] bg-[#f4f6f6]'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-[#8a949b]">{formatTime(entry.recordedAt)} · {formatRelativeTime(entry.recordedAt)}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-[#1d2a30]">{entry.rawText}</h3>
                  {entry.needReview && <p className="mt-1 text-xs text-[#9a6b31]">{entry.reviewReason || '建议确认'}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <strong className="rounded-full bg-white px-3 py-1.5 text-sm text-[#2e8b8b] shadow-[0_4px_10px_rgba(95,123,102,0.08)]">{entry.finalTotalCalories} kcal</strong>
                  <button className="rounded-full bg-white p-2 text-[#c14b6e] transition hover:bg-[#fde6ed] active:translate-y-px" onClick={() => void onDeleteEntry(entry.id)} title="删除整条记录" type="button">
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid flex-1 gap-2">
                {entry.foodItems.length > 0 && (
                  <div className="rounded-[18px] bg-white px-3 py-2.5">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#2e8b8b]">食物</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.foodItems.map((item) => (
                        <span key={item.id} className="rounded-full bg-[#e9f3f1] px-2.5 py-1 text-xs text-[#4a5860]">
                          {item.name} × {item.quantity}{item.unit || ''} · {item.calories} kcal
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {entry.waterItems.length > 0 && (
                  <div className="rounded-[18px] bg-white px-3 py-2.5">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#d18a3f]">饮水</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.waterItems.map((water) => (
                        <span key={`water-${water.id}`} className="rounded-full bg-[#f8f0e3] px-2.5 py-1 text-xs text-[#8a5b24]">
                          {water.rawText}: {water.amountMl} ml
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {entries.length > 5 && (
          <button
            className="mx-auto mt-1 rounded-full border border-[#cdd6d6] bg-white/80 px-5 py-2.5 text-sm text-[#4a5860] transition hover:bg-white active:translate-y-px lg:col-span-2"
            type="button"
            onClick={onToggleShowAll}
          >
            {showAllEntries ? '收起明细' : `展开全部 ${entries.length} 条`}
          </button>
        )}
      </div>
    </section>
  );
}
