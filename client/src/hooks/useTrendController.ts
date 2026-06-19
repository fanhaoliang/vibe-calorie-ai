import { useCallback, useEffect, useState } from 'react';
import { addDays } from '../utils/date';
import type { TrendView, TrendRange } from '../components/TrendSection';

/**
 * 管理趋势区块的 view / range / customRange 三个状态，
 * 派生 (start, end) 并在变化时拉取相应数据源。
 *
 * 上层只需把它返回的 view/range/customRange + change handlers 透传给 TrendSection。
 *
 * refreshRange / refreshWeight 必须是稳定引用（在调用方用 useCallback 包），
 * 否则 effect 会死循环。
 */
export function useTrendController(
  selectedDate: string,
  refreshRange: (start: string, end: string) => Promise<void>,
  refreshWeight: (start: string, end: string) => Promise<void>
) {
  const [trendView, setTrendView] = useState<TrendView>('diet');
  const [trendRange, setTrendRange] = useState<TrendRange>('day');
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);

  const resolveDates = useCallback(
    (range: TrendRange, rangeValue: [string, string] | null) => {
      if (range === 'custom' && rangeValue) {
        return { start: rangeValue[0], end: rangeValue[1] };
      }
      if (range === '7d') {
        return { start: addDays(selectedDate, -6), end: selectedDate };
      }
      if (range === '30d') {
        return { start: addDays(selectedDate, -29), end: selectedDate };
      }
      return { start: selectedDate, end: selectedDate };
    },
    [selectedDate]
  );

  useEffect(() => {
    const { start, end } = resolveDates(trendRange, customRange);
    if (trendView === 'weight') {
      void refreshWeight(start, end);
    } else {
      void refreshRange(start, end);
    }
  }, [trendView, trendRange, customRange, resolveDates, refreshRange, refreshWeight]);

  const handleRangeChange = useCallback(
    (range: TrendRange) => {
      setTrendRange(range);
      if (range === 'custom' && !customRange) {
        const start = addDays(selectedDate, -6);
        setCustomRange([start, selectedDate]);
      } else if (range !== 'custom') {
        setCustomRange(null);
      }
    },
    [customRange, selectedDate]
  );

  return {
    trendView,
    trendRange,
    customRange,
    setCustomRange,
    onViewChange: setTrendView,
    onRangeChange: handleRangeChange
  };
}
