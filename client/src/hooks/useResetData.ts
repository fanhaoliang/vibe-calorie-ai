import { useCallback } from 'react';
import { api } from '../api';
import { formatDateShanghai } from '../utils/date';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;

/**
 * "从头再来"：用户确认后清空所有本地数据，重置 UI 状态并刷新当天。
 */
export function useResetData(opts: {
  isSubmitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onResetState: (nextDate: string, nextDateTime: Date) => void;
}) {
  return useCallback(async () => {
    if (opts.isSubmitting()) return;
    const ok = window.confirm('这会清空所有数据，你确定要重新开始吗？');
    if (!ok) return;
    opts.setSubmitting(true);
    opts.setMessage('');
    try {
      await api('/api/all-data', { method: 'DELETE' });
      const now = new Date();
      const nextDate = formatDateShanghai(now);
      opts.onResetState(nextDate, now);
      await opts.refresh(nextDate);
      opts.setMessage('已重新开始，所有本地记录已清空');
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '重新开始失败');
    } finally {
      opts.setSubmitting(false);
    }
  }, [opts]);
}