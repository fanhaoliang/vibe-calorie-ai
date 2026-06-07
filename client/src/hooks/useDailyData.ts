import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { todayShanghai } from '../utils/date';
import type { Summary, FoodEntry, WaterEntry } from '../types';

/**
 * 管理每日数据：summary / entries / waters，以及 refresh、loading、message。
 *
 * 组件挂载时自动刷新当天数据。
 * refresh(date) 并发请求汇总/饮食/饮水三个接口。
 * 返回 weightKg 让上层把最新已知体重同步到表单。
 */
export function useDailyData() {
  const current = todayShanghai();
  const [summary, setSummary] = useState<Summary>({
    date: current,
    totalCalories: 0,
    waterTotalMl: 0,
    foodEntryCount: 0,
    waterEntryCount: 0,
    weightKg: null,
    weightRecordedAt: null
  });
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [waters, setWaters] = useState<WaterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async (date: string) => {
    setLoading(true);
    setMessage('');
    try {
      const [nextSummary, nextEntries, nextWaters] = await Promise.all([
        api<Summary>(`/api/daily-summary?date=${date}`),
        api<FoodEntry[]>(`/api/food-entries?date=${date}`),
        api<WaterEntry[]>(`/api/water-entries?date=${date}`)
      ]);
      setSummary(nextSummary);
      setEntries(nextEntries);
      setWaters(nextWaters);
      return { weightKg: nextSummary.weightKg ?? undefined };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刷新失败');
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { summary, entries, waters, loading, message, setMessage, refresh };
}