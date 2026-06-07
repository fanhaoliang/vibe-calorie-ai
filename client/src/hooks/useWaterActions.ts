import { useState, useCallback } from 'react';
import { api } from '../api';

type RefreshFn = (date: string) => Promise<{ weightKg?: number }>;

/**
 * 饮水相关操作：快捷加水、自定义提交、删除记录。
 *
 * 持有自定义饮水输入框的 waterAmount。
 * submitting 由调用方管理（与饮食提交共享同一个锁）。
 */
export function useWaterActions(opts: {
  recordedAtNow: () => string;
  isSubmitting: () => boolean;
  setSubmitting: (value: boolean) => void;
  setMessage: (msg: string) => void;
  refresh: RefreshFn;
  onAfterSubmitDate: (date: string) => void;
}) {
  const [waterAmount, setWaterAmount] = useState('');

  const quickWater = useCallback(async (amountMl: number) => {
    if (opts.isSubmitting()) return;
    opts.setSubmitting(true);
    opts.setMessage('');
    const recordedAt = opts.recordedAtNow();
    const recordDate = recordedAt.slice(0, 10);
    try {
      await api('/api/water-entries', { method: 'POST', body: JSON.stringify({ amountMl, recordedAt }) });
      opts.onAfterSubmitDate(recordDate);
      await opts.refresh(recordDate);
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '饮水记录失败');
    } finally {
      opts.setSubmitting(false);
    }
  }, [opts]);

  const submitWater = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const amountMl = Number(waterAmount);
    if (!Number.isFinite(amountMl) || amountMl <= 0) return;
    setWaterAmount('');
    await quickWater(amountMl);
  }, [waterAmount, quickWater]);

  const deleteWaterEntry = useCallback(async (waterId: number, currentDate: string) => {
    if (!window.confirm('删除这条饮水记录？')) return;
    opts.setMessage('');
    try {
      await api(`/api/water-entries/${waterId}`, { method: 'DELETE' });
      await opts.refresh(currentDate);
    } catch (error) {
      opts.setMessage(error instanceof Error ? error.message : '删除失败');
    }
  }, [opts]);

  return { waterAmount, setWaterAmount, quickWater, submitWater, deleteWaterEntry };
}