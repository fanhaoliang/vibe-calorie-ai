import { useCallback } from 'react';
import { api } from '../api';
import type { FoodEntry, FoodEntryDraft } from '../types';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;
type ToastShow = (message: string, options?: { undo?: () => void | Promise<void>; duration?: number }) => number;

/**
 * 保存体重 + 删除饮食记录。
 *
 * 删除走"立即生效 + toast 撤销"模式：不再用 confirm 弹窗。
 * 撤销时把原 entry 通过 POST /api/food-entries 带 parsed 重建一条新记录，
 * id 会变（以 entry.id+timestamp 为新 id），但内容和热量等价。
 */
export function useMutations(opts: {
  recordedAtNow: () => string;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onAfterSubmitDate: (date: string) => void;
  showToast: ToastShow;
}) {
  const saveWeight = useCallback(async (weightKg: number) => {
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 250) {
      opts.setMessage('体重需要在 20 到 250 kg 之间');
      return;
    }
    opts.setMessage('');
    const recordedAt = opts.recordedAtNow();
    const recordDate = recordedAt.slice(0, 10);
    try {
      await api('/api/weight-entries', {
        method: 'POST',
        body: JSON.stringify({ date: recordDate, weightKg, recordedAt })
      });
      opts.onAfterSubmitDate(recordDate);
      await opts.refresh(recordDate);
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '体重保存失败');
    }
  }, [opts]);

  const deleteFoodEntry = useCallback(async (entry: FoodEntry, currentDate: string) => {
    opts.setMessage('');
    try {
      await api(`/api/food-entries/${entry.id}`, { method: 'DELETE' });
      await opts.refresh(currentDate);
      opts.showToast(`已删除 "${truncate(entry.rawText)}"`, {
        undo: async () => {
          const draft: FoodEntryDraft = {
            recordedAt: entry.recordedAt,
            rawText: entry.rawText,
            parseSource: entry.parseSource ?? 'manual',
            parseStatus: entry.parseStatus ?? 'success',
            llmTotalCalories: entry.llmTotalCalories ?? entry.finalTotalCalories,
            finalTotalCalories: entry.finalTotalCalories,
            totalCalories: entry.finalTotalCalories,
            needReview: entry.needReview,
            reviewReason: entry.reviewReason,
            ignoredItems: entry.ignoredItems ?? [],
            foodItems: entry.foodItems,
            waterItems: entry.waterItems
          } as FoodEntryDraft;
          await api('/api/food-entries', {
            method: 'POST',
            body: JSON.stringify({
              text: entry.rawText,
              recordedAt: entry.recordedAt,
              parsed: draft
            })
          });
          await opts.refresh(currentDate);
        }
      });
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '删除失败');
    }
  }, [opts]);

  return { saveWeight, deleteFoodEntry };
}

function truncate(text: string, max = 14) {
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}