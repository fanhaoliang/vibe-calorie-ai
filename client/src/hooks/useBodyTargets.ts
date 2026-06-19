import { useMemo } from 'react';
import { CALORIE_TARGET, PERSON_HEIGHT_CM, WATER_ML_PER_KG } from '../constants';
import { buildBodyMetrics, percent, ratioPercent } from '../utils/metrics';

/**
 * 由当前体重派生的所有目标量与进度百分比。
 *
 *   bodyMetrics    bmi / waterTargetMl / bodyCoefficient
 *   calorieTarget  按体型系数调整后的当日热量目标
 *   *Progress      0-100% 进度条用
 *   calorieRatio   不限上限的百分比，用于"已达 120%"
 *   calorieOverBy  超目标 kcal 数（未超时为 0）
 */
export function useBodyTargets(weightKg: number, totalCalories: number, waterTotalMl: number) {
  const bodyMetrics = useMemo(
    () => buildBodyMetrics(weightKg, PERSON_HEIGHT_CM, WATER_ML_PER_KG),
    [weightKg]
  );

  return useMemo(() => {
    const calorieTarget = Math.round(CALORIE_TARGET * bodyMetrics.bodyCoefficient);
    return {
      bodyMetrics,
      calorieTarget,
      calorieProgress: percent(totalCalories, calorieTarget),
      calorieRatio: ratioPercent(totalCalories, calorieTarget),
      calorieOverBy: Math.max(0, totalCalories - calorieTarget),
      isCalorieWarning: totalCalories > calorieTarget,
      waterProgress: percent(waterTotalMl, bodyMetrics.waterTargetMl)
    };
  }, [bodyMetrics, totalCalories, waterTotalMl]);
}
