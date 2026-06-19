// 仪表盘状态文案：基于当前值与目标返回中性的数据陈述。
// 无煽情、无鼓励，只给事实，让用户看一眼就清楚还差多少 / 超了多少。

export function toneForCalories(value: number, target: number) {
  if (target <= 0) return '';
  if (value === 0) return `还差 ${target} kcal`;
  if (value <= target) return `还差 ${target - value} kcal`;
  return `已超出 ${value - target} kcal`;
}

export function toneForWater(value: number, target: number) {
  if (target <= 0) return '';
  if (value >= target) return '已达成';
  return `还差 ${target - value} ml`;
}

export function toneForRecords(value: number) {
  if (value === 0) return '今天还没有记录';
  return `${value} 条记录`;
}
