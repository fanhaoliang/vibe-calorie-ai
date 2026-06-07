import { useState, useCallback } from 'react';
import { api } from '../api';
import type { FoodEntryDraft, FoodEntry } from '../types';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;

/**
 * 饮食文本的两步提交流程：
 *   submitFood             POST /api/food-entries/preview 解析（不保存）→ 打开预览弹窗
 *   updateDraftFoodName    POST /api/food-entries/recalculate 编辑食物名后重算
 *   saveDraftEntry         POST /api/food-entries 把确认后的草稿写入数据库
 *
 * 持有 foodText 输入和 resultEntry 预览状态。
 * 真正的 submitting 状态由调用方传入，这样多个写操作能共享同一个锁。
 */
export function useFoodEntry(opts: {
  recordedAtNow: () => string;
  isSubmitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onAfterSubmitDate: (date: string) => void;
}) {
  const [foodText, setFoodText] = useState('');
  const [resultEntry, setResultEntry] = useState<FoodEntryDraft | null>(null);

  const submitFood = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = foodText.trim();
    if (!text || opts.isSubmitting()) return;
    opts.setSubmitting(true);
    opts.setMessage('');
    const recordedAt = opts.recordedAtNow();
    const recordDate = recordedAt.slice(0, 10);
    try {
      const draft = await api<FoodEntryDraft>('/api/food-entries/preview', {
        method: 'POST',
        body: JSON.stringify({ text, recordedAt })
      });
      opts.onAfterSubmitDate(recordDate);
      setResultEntry({
        ...draft,
        recordedAt,
        foodItems: draft.foodItems.map((item, index) => ({ ...item, id: item.id ?? -(index + 1) })),
        waterItems: draft.waterItems.map((item, index) => ({ ...item, id: item.id ?? -(index + 1) }))
      });
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '解析失败');
    } finally {
      opts.setSubmitting(false);
    }
  }, [foodText, opts]);

  const updateDraftFoodName = useCallback(async (index: number, name: string) => {
    if (!resultEntry) return;
    const nextDraft = {
      ...resultEntry,
      foodItems: resultEntry.foodItems.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item)
    };
    setResultEntry(nextDraft);

    try {
      const recalculated = await api<FoodEntryDraft>('/api/food-entries/recalculate', {
        method: 'POST',
        body: JSON.stringify({ parsed: nextDraft })
      });
      setResultEntry({
        ...nextDraft,
        ...recalculated,
        recordedAt: nextDraft.recordedAt,
        rawText: nextDraft.rawText,
        foodItems: recalculated.foodItems.map((item, itemIndex) => ({ ...item, id: nextDraft.foodItems[itemIndex]?.id ?? -(itemIndex + 1) })),
        waterItems: recalculated.waterItems.map((item, itemIndex) => ({ ...item, id: nextDraft.waterItems[itemIndex]?.id ?? -(itemIndex + 1) }))
      });
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '热量重算失败');
    }
  }, [resultEntry, opts]);

  const saveDraftEntry = useCallback(async () => {
    if (!resultEntry || opts.isSubmitting()) return;
    opts.setSubmitting(true);
    opts.setMessage('');
    const recordedAt = resultEntry.recordedAt || opts.recordedAtNow();
    const recordDate = recordedAt.slice(0, 10);
    try {
      await api<FoodEntry>('/api/food-entries', {
        method: 'POST',
        body: JSON.stringify({ text: resultEntry.rawText, recordedAt, parsed: resultEntry })
      });
      setFoodText('');
      setResultEntry(null);
      opts.onAfterSubmitDate(recordDate);
      await opts.refresh(recordDate);
      opts.setMessage('已保存，并记住这次识别');
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      opts.setSubmitting(false);
    }
  }, [resultEntry, opts]);

  return { foodText, setFoodText, resultEntry, setResultEntry, submitFood, updateDraftFoodName, saveDraftEntry };
}