import { useCallback } from 'react';
import { api } from '../api';
import { formatDateShanghai } from '../utils/date';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;

/**
 * "从头再来"：清空所有本地数据。
 *
 * 这是一个不可恢复的高危操作，所以走两步确认：
 *   1. 第一次 confirm 描述影响范围
 *   2. 第二次 prompt 要求用户输入"删除"才执行
 */
export function useResetData(opts: {
  isSubmitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onResetState: (nextDate: string, nextDateTime: Date) => void;
  showToast: (message: string, options?: { duration?: number }) => number;
}) {
  return useCallback(async () => {
    if (opts.isSubmitting()) return;
    const ok = window.confirm('这会清空所有饮食、饮水、体重、食物库记录，且无法恢复。继续吗？');
    if (!ok) return;
    const phrase = window.prompt('请输入"删除"以最终确认');
    if (phrase?.trim() !== '删除') return;
    opts.setSubmitting(true);
    opts.setMessage('');
    try {
      await api('/api/all-data', { method: 'DELETE' });
      const now = new Date();
      const nextDate = formatDateShanghai(now);
      opts.onResetState(nextDate, now);
      await opts.refresh(nextDate);
      opts.showToast('已清空所有记录');
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '清空失败');
    } finally {
      opts.setSubmitting(false);
    }
  }, [opts]);
}