import { useCallback } from 'react';
import { api } from '../api';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;

/**
 * 保存体重 + 删除饮食记录 + 一键重置。
 *
 * 三个写操作都比较轻，集中放在一个 hook 里，避免散落到太多文件。
 */
export function useMutations(opts: {
  recordedAtNow: () => string;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onAfterSubmitDate: (date: string) => void;
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

  const deleteFoodEntry = useCallback(async (entryId: number, currentDate: string) => {
    if (!window.confirm('删除整条饮食记录？这条记录里的食物和随文本记录的水都会删除。')) return;
    opts.setMessage('');
    try {
      await api(`/api/food-entries/${entryId}`, { method: 'DELETE' });
      await opts.refresh(currentDate);
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '删除失败');
    }
  }, [opts]);

  return { saveWeight, deleteFoodEntry };
}