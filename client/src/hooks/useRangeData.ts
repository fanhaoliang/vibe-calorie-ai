import { useState, useCallback } from 'react';
import { api } from '../api';
import type { Summary } from '../types';

export type WeightPoint = {
  id: number;
  date: string;
  recordedAt: string;
  weightKg: number | null;
};

export function useRangeData() {
  const [rangeData, setRangeData] = useState<Summary[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [weightData, setWeightData] = useState<WeightPoint[]>([]);
  const [weightLoading, setWeightLoading] = useState(false);

  const refreshRange = useCallback(async (start: string, end: string) => {
    setRangeLoading(true);
    try {
      const data = await api<Summary[]>(`/api/daily-summaries?start=${start}&end=${end}`);
      setRangeData(data);
    } catch {
      setRangeData([]);
    } finally {
      setRangeLoading(false);
    }
  }, []);

  const refreshWeight = useCallback(async (start: string, end: string) => {
    setWeightLoading(true);
    try {
      const data = await api<WeightPoint[]>(`/api/weight-entries?start=${start}&end=${end}`);
      setWeightData(data);
    } catch {
      setWeightData([]);
    } finally {
      setWeightLoading(false);
    }
  }, []);

  return { rangeData, rangeLoading, refreshRange, weightData, weightLoading, refreshWeight };
}
