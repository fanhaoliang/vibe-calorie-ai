// 数值与身体指标计算。

// 0–100% 进度条用（超出上限取 100）
export function percent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

// 不限制上限的百分比（用于"已达 120%"这种超目标显示）
export function ratioPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

/**
 * 根据当前体重 + 固定身高 + 每 kg 饮水量计算：
 *   bmi              当前 BMI
 *   waterTargetMl    饮水目标（按 weightKg * waterMlPerKg）
 *   bodyCoefficient  bmi/22，用于把基础热量目标按体型动态调整
 */
export function buildBodyMetrics(weightKg: number, personHeightCm: number, waterMlPerKg: number) {
  const heightM = personHeightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const waterTargetMl = Math.round(weightKg * waterMlPerKg);
  const bodyCoefficient = bmi / 22;
  return { bmi, waterTargetMl, bodyCoefficient };
}
