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
    <section className="mt-4 rounded-[34px] border border-[#e8dfd2] bg-white/82 p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#303b33]">今天的明细</h2>
          <p className="mt-1 text-sm text-[#7d8279]">输入后会自动保存到这里，必要时可以删除整条记录重记。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#eef3e9] px-3 py-1 text-sm text-[#5f7b66]">{entries.length} 条饮食</span>
        </div>
      </div>
      <div className="grid gap-3">
        {!loading && !entries.length && (
          <div className="rounded-[24px] border border-dashed border-[#d9cebd] bg-[#fbf8f1]/70 px-4 py-8 text-center text-sm text-[#7d8279]">
            记录第一餐，开启美好一天～
          </div>
        )}
        {visibleEntries.map((entry) => {
          const entryNeedsReview = entry.needReview || entry.foodItems.some((item) => item.needReview) || entry.waterItems.some((item) => item.needReview);
          return (
            <article key={entry.id} className={`rounded-[26px] border p-4 ${entryNeedsReview ? 'border-[#efc98a] bg-[#fff8eb] shadow-[0_16px_34px_rgba(154,107,49,0.10)]' : 'border-[#eadfce] bg-[#fbf8f1]'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[#7d8279]">{formatTime(entry.recordedAt)} · {formatRelativeTime(entry.recordedAt)}</p>
                  <h3 className="mt-1 text-base font-semibold leading-6 text-[#303b33]">{entry.rawText}</h3>
                  {entry.needReview && <p className="mt-2 text-sm text-[#9a6b31]">{entry.reviewReason || '建议确认'}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <strong className="rounded-full bg-white px-4 py-2 text-sm text-[#5f7b66]">{entry.finalTotalCalories} kcal</strong>
                  <button className="rounded-full bg-white p-2.5 text-[#9b6b5c] transition hover:bg-[#fff3ef] active:translate-y-px" onClick={() => void onDeleteEntry(entry.id)} title="删除整条记录" type="button">
                    <Trash size={18} weight="duotone" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {entry.foodItems.length > 0 && (
                  <div className="rounded-[20px] bg-white px-3 py-3">
                    <p className="mb-2 text-xs font-medium text-[#6f8e77]">食物</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.foodItems.map((item) => (
                        <span key={item.id} className="rounded-full bg-[#f4f7ed] px-3 py-1.5 text-sm text-[#596159]">
                          {item.name} x {item.quantity}{item.unit || ''} · {item.calories} kcal
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {entry.waterItems.length > 0 && (
                  <div className="rounded-[20px] bg-white px-3 py-3">
                    <p className="mb-2 text-xs font-medium text-[#d18a3f]">饮水</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.waterItems.map((water) => (
                        <span key={`water-${water.id}`} className="rounded-full bg-[#f8f0e3] px-3 py-1.5 text-sm text-[#8a5b24]">
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
            className="mx-auto mt-1 rounded-full border border-[#d8cebd] bg-white/80 px-5 py-2.5 text-sm text-[#626a60] transition hover:bg-white active:translate-y-px"
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
