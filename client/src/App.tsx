import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FoodEntryForm from './components/FoodEntryForm';
import Dashboard from './components/Dashboard';
import WaterSection from './components/WaterSection';
import TrendSection from './components/TrendSection';
import EntryList from './components/EntryList';
import ResultModal from './components/ResultModal';
import LoadingOverlay from './components/LoadingOverlay';
import { CALORIE_TARGET, PERSON_HEIGHT_CM, DEFAULT_WEIGHT_KG, WATER_ML_PER_KG } from './constants';
import { todayShanghai, formatDateShanghai, formatDateTimeShanghai, addDays } from './utils/date';
import { percent, ratioPercent, buildBodyMetrics } from './utils/metrics';
import { toneForCalories, toneForWater } from './utils/tone';
import { buildTodayPoints } from './utils/chart';
import { useDailyData } from './hooks/useDailyData';
import { useRangeData } from './hooks/useRangeData';
import { useFoodEntry } from './hooks/useFoodEntry';
import { useWaterActions } from './hooks/useWaterActions';
import { useMutations } from './hooks/useMutations';
import { useResetData } from './hooks/useResetData';
import type { TrendView, TrendRange } from './components/TrendSection';

const PAGE_BACKGROUND =
  'pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(126,154,134,0.24),transparent_30%),radial-gradient(circle_at_90%_12%,rgba(231,164,79,0.18),transparent_28%),linear-gradient(180deg,#f8f5ee_0%,#f2ecdf_100%)]';

export default function App() {
  const current = todayShanghai();

  // ===== 顶层状态：日期、体重、提交锁、消息 =====
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const [selectedDate, setSelectedDate] = useState(current);
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trendView, setTrendView] = useState<TrendView>('diet');
  const [trendRange, setTrendRange] = useState<TrendRange>('day');
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);

  // submitting 用 ref 同步读取，避免 hook 回调闭包拿到旧值
  const submittingRef = useRef(false);
  const setSubmittingBoth = (value: boolean) => {
    submittingRef.current = value;
    setSubmitting(value);
  };
  const isSubmitting = () => submittingRef.current;

  // ===== 每日数据：summary / entries / waters =====
  const daily = useDailyData();
  const { summary, entries, waters, loading, message, setMessage } = daily;

  // ===== 多日范围数据 =====
  const { rangeData, rangeLoading, refreshRange, weightData, weightLoading, refreshWeight } = useRangeData();

  // 数据刷新时把最新已知体重同步到表单
  const refresh = async (date: string) => {
    const result = await daily.refresh(date);
    if (result.weightKg) setWeightKg(result.weightKg);
    return result;
  };

  // 根据 range 和 selectedDate 计算起止日期
  const resolveDates = useCallback(
    (range: TrendRange, rangeValue: [string, string] | null) => {
      let start: string;
      let end: string;
      if (range === 'custom' && rangeValue) {
        [start, end] = rangeValue;
      } else if (range === '7d') {
        start = addDays(selectedDate, -6);
        end = selectedDate;
      } else if (range === '30d') {
        start = addDays(selectedDate, -29);
        end = selectedDate;
      } else {
        start = selectedDate;
        end = selectedDate;
      }
      return { start, end };
    },
    [selectedDate]
  );

  // 趋势刷新：视图 + 范围变化时自动拉取
  const refreshTrend = useCallback(
    async (view: TrendView, range: TrendRange, rangeValue: [string, string] | null) => {
      const { start, end } = resolveDates(range, rangeValue);
      if (view === 'weight') {
        await refreshWeight(start, end);
      } else if (range === 'day') {
        await refreshRange(start, end);
      } else {
        await refreshRange(start, end);
      }
    },
    [resolveDates, refreshRange, refreshWeight]
  );

  useEffect(() => {
    void refreshTrend(trendView, trendRange, customRange);
  }, [trendView, trendRange, customRange, selectedDate, refreshTrend]);

  // 各业务 hook 共享同一组依赖
  const hookDeps = {
    recordedAtNow: () => formatDateTimeShanghai(selectedDateTime),
    isSubmitting,
    setSubmitting: setSubmittingBoth,
    setMessage,
    refresh,
    onAfterSubmitDate: setSelectedDate
  };

  const food = useFoodEntry(hookDeps);
  const water = useWaterActions(hookDeps);
  const { saveWeight, deleteFoodEntry } = useMutations({
    recordedAtNow: hookDeps.recordedAtNow,
    setMessage,
    refresh,
    onAfterSubmitDate: setSelectedDate
  });
  const resetAllData = useResetData({
    isSubmitting,
    setSubmitting: setSubmittingBoth,
    setMessage,
    refresh,
    onResetState: (nextDate, nextDateTime) => {
      food.setFoodText('');
      water.setWaterAmount('');
      food.setResultEntry(null);
      setShowAllEntries(false);
      setSelectedDateTime(nextDateTime);
      setSelectedDate(nextDate);
    }
  });

  // ===== 派生计算 =====
  const recordCount = summary.foodEntryCount + summary.waterEntryCount;
  const bodyMetrics = useMemo(
    () => buildBodyMetrics(weightKg, PERSON_HEIGHT_CM, WATER_ML_PER_KG),
    [weightKg]
  );
  const calorieTarget = Math.round(CALORIE_TARGET * bodyMetrics.bodyCoefficient);
  const calorieProgress = percent(summary.totalCalories, calorieTarget);
  const waterProgress = percent(summary.waterTotalMl, bodyMetrics.waterTargetMl);
  const todayPoints = useMemo(() => buildTodayPoints(entries, waters), [entries, waters]);
  const calorieRatio = ratioPercent(summary.totalCalories, calorieTarget);
  const calorieOverBy = Math.max(0, summary.totalCalories - calorieTarget);
  const isCalorieWarning = summary.totalCalories > calorieTarget;

  const handleDateChange = (nextDate: Date) => {
    const nextDateText = formatDateShanghai(nextDate);
    setSelectedDateTime(nextDate);
    setSelectedDate(nextDateText);
    void refresh(nextDateText);
  };

  const handleViewChange = (view: TrendView) => {
    setTrendView(view);
  };

  const handleRangeChange = (range: TrendRange) => {
    setTrendRange(range);
    if (range === 'custom' && !customRange) {
      const start = addDays(selectedDate, -6);
      setCustomRange([start, selectedDate]);
    } else if (range !== 'custom') {
      setCustomRange(null);
    }
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f8f5ee] text-[#2f342f]">
      <div className={PAGE_BACKGROUND} />
      <div className="relative mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:py-7">
        <Header
          selectedDateTime={selectedDateTime}
          submitting={submitting}
          onDateChange={handleDateChange}
          onReset={resetAllData}
        />

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
          <FoodEntryForm
            foodText={food.foodText}
            submitting={submitting}
            onChange={food.setFoodText}
            onSubmit={food.submitFood}
          />
          <Dashboard
            summary={summary}
            weightKg={weightKg}
            calorieTarget={calorieTarget}
            calorieProgress={calorieProgress}
            calorieRatio={calorieRatio}
            calorieOverBy={calorieOverBy}
            isCalorieWarning={isCalorieWarning}
            bodyMetrics={bodyMetrics}
            recordCount={recordCount}
            toneForCalories={toneForCalories(summary.totalCalories, calorieTarget)}
            onSaveWeight={(event) => { event?.preventDefault(); void saveWeight(weightKg); }}
            onWeightChange={setWeightKg}
          />
        </section>

        <WaterSection
          summary={summary}
          bodyMetrics={bodyMetrics}
          waters={waters}
          waterAmount={water.waterAmount}
          submitting={submitting}
          waterProgress={waterProgress}
          onQuickWater={water.quickWater}
          onWaterAmountChange={water.setWaterAmount}
          onSubmitWater={water.submitWater}
          onDeleteWater={(id) => water.deleteWaterEntry(id, selectedDate)}
          toneForWater={toneForWater(summary.waterTotalMl, bodyMetrics.waterTargetMl)}
        />

        {message && (
          <div className="mt-4 rounded-[22px] border border-[#e8c2b8] bg-[#fff3ef] px-4 py-3 text-sm text-[#924a3b]">
            {message}
          </div>
        )}

        <TrendSection
          view={trendView}
          range={trendRange}
          onViewChange={handleViewChange}
          onRangeChange={handleRangeChange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          loading={loading}
          todayPoints={todayPoints}
          summary={summary}
          rangeData={rangeData}
          rangeLoading={rangeLoading}
          weightData={weightData}
          weightLoading={weightLoading}
        />

        <EntryList
          entries={entries}
          loading={loading}
          showAllEntries={showAllEntries}
          onToggleShowAll={() => setShowAllEntries((value) => !value)}
          onDeleteEntry={(id) => deleteFoodEntry(id, selectedDate)}
        />
      </div>

      {submitting && <LoadingOverlay />}

      {food.resultEntry && (
        <ResultModal
          resultEntry={food.resultEntry}
          submitting={submitting}
          onClose={() => food.setResultEntry(null)}
          onSave={food.saveDraftEntry}
          onUpdateFoodName={food.updateDraftFoodName}
        />
      )}
    </main>
  );
}
