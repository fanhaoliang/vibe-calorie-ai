import { useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import FoodEntryForm from './components/FoodEntryForm';
import Dashboard from './components/Dashboard';
import WaterSection from './components/WaterSection';
import TrendSection from './components/TrendSection';
import EntryList from './components/EntryList';
import ResultModal from './components/ResultModal';
import LoadingOverlay from './components/LoadingOverlay';
import { DEFAULT_WEIGHT_KG } from './constants';
import { todayShanghai, formatDateShanghai, formatDateTimeShanghai } from './utils/date';
import { toneForCalories, toneForWater } from './utils/tone';
import { buildTodayPoints } from './utils/chart';
import { useDailyData } from './hooks/useDailyData';
import { useRangeData } from './hooks/useRangeData';
import { useFoodEntry } from './hooks/useFoodEntry';
import { useWaterActions } from './hooks/useWaterActions';
import { useMutations } from './hooks/useMutations';
import { useResetData } from './hooks/useResetData';
import { useTrendController } from './hooks/useTrendController';
import { useBodyTargets } from './hooks/useBodyTargets';
import { useToast } from './hooks/useToast';
import ToastHost from './components/ToastHost';

export default function App() {
  const current = todayShanghai();

  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const [selectedDate, setSelectedDate] = useState(current);
  const [selectedDateTime, setSelectedDateTime] = useState(() => new Date());
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // submitting 用 ref 同步读取，避免 hook 回调闭包拿到旧值
  const submittingRef = useRef(false);
  const setSubmittingBoth = (value: boolean) => {
    submittingRef.current = value;
    setSubmitting(value);
  };
  const isSubmitting = () => submittingRef.current;

  const daily = useDailyData();
  const { summary, entries, waters, loading, message, setMessage } = daily;

  const { rangeData, rangeLoading, refreshRange, weightData, weightLoading, refreshWeight } = useRangeData();

  const refresh = async (date: string) => {
    const result = await daily.refresh(date);
    if (result.weightKg) setWeightKg(result.weightKg);
    return result;
  };

  const trend = useTrendController(selectedDate, refreshRange, refreshWeight);

  const toast = useToast();

  const hookDeps = {
    recordedAtNow: () => formatDateTimeShanghai(selectedDateTime),
    isSubmitting,
    setSubmitting: setSubmittingBoth,
    setMessage,
    refresh,
    onAfterSubmitDate: setSelectedDate
  };

  const food = useFoodEntry({ ...hookDeps, showToast: toast.show });
  const water = useWaterActions({
    ...hookDeps,
    showToast: toast.show,
    getWaterById: (id) => waters.find((w) => w.id === id)
  });
  const { saveWeight, deleteFoodEntry } = useMutations({
    recordedAtNow: hookDeps.recordedAtNow,
    setMessage,
    refresh,
    onAfterSubmitDate: setSelectedDate,
    showToast: toast.show
  });
  const resetAllData = useResetData({
    isSubmitting,
    setSubmitting: setSubmittingBoth,
    setMessage,
    refresh,
    showToast: toast.show,
    onResetState: (nextDate, nextDateTime) => {
      food.setFoodText('');
      water.setWaterAmount('');
      food.setResultEntry(null);
      setShowAllEntries(false);
      setSelectedDateTime(nextDateTime);
      setSelectedDate(nextDate);
    }
  });

  const targets = useBodyTargets(weightKg, summary.totalCalories, summary.waterTotalMl);
  const recordCount = summary.foodEntryCount + summary.waterEntryCount;
  const todayPoints = useMemo(() => buildTodayPoints(entries, waters), [entries, waters]);

  const handleDateChange = (nextDate: Date) => {
    const nextDateText = formatDateShanghai(nextDate);
    setSelectedDateTime(nextDate);
    setSelectedDate(nextDateText);
    void refresh(nextDateText);
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8f5ee] text-[#2f342f]">
      <div className="aurora-bg" aria-hidden="true" />
      <div className="aurora-noise" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:py-7">
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
            calorieTarget={targets.calorieTarget}
            calorieProgress={targets.calorieProgress}
            calorieRatio={targets.calorieRatio}
            calorieOverBy={targets.calorieOverBy}
            isCalorieWarning={targets.isCalorieWarning}
            bodyMetrics={targets.bodyMetrics}
            recordCount={recordCount}
            toneForCalories={toneForCalories(summary.totalCalories, targets.calorieTarget)}
            onSaveWeight={(event) => { event?.preventDefault(); void saveWeight(weightKg); }}
            onWeightChange={setWeightKg}
          />
        </section>

        <WaterSection
          summary={summary}
          bodyMetrics={targets.bodyMetrics}
          waters={waters}
          waterAmount={water.waterAmount}
          submitting={submitting}
          waterProgress={targets.waterProgress}
          onQuickWater={water.quickWater}
          onWaterAmountChange={water.setWaterAmount}
          onSubmitWater={water.submitWater}
          onDeleteWater={(id) => water.deleteWaterEntry(id, selectedDate)}
          toneForWater={toneForWater(summary.waterTotalMl, targets.bodyMetrics.waterTargetMl)}
        />

        {message && (
          <div className="mt-4 rounded-[22px] border border-[#e8c2b8] bg-[#fff3ef] px-4 py-3 text-sm text-[#924a3b]">
            {message}
          </div>
        )}

        <TrendSection
          view={trend.trendView}
          range={trend.trendRange}
          onViewChange={trend.onViewChange}
          onRangeChange={trend.onRangeChange}
          customRange={trend.customRange}
          onCustomRangeChange={trend.setCustomRange}
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
          onDeleteEntry={(id) => {
            const entry = entries.find((e) => e.id === id);
            if (entry) void deleteFoodEntry(entry, selectedDate);
          }}
        />
      </div>

      {submitting && <LoadingOverlay />}

      {food.resultEntry && (
        <ResultModal
          resultEntry={food.resultEntry}
          submitting={submitting}
          onClose={() => food.setResultEntry(null)}
          onSave={food.saveDraftEntry}
          onUpdateFoodItem={food.updateDraftFoodItem}
        />
      )}

      <ToastHost toasts={toast.toasts} onDismiss={toast.dismiss} />
    </main>
  );
}
