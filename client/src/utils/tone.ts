// 仪表盘状态文案：根据当前值和目标返回中文鼓励/提醒。
// 这些字符串直接进 UI，调整 wording 时不影响其他逻辑。

export function toneForCalories(value: number, target: number) {
  if (value === 0) return '记录第一餐，开启温和减脂的一天';
  if (value < target * 0.65) return '节奏很轻，后面可以正常吃';
  if (value <= target) return '接近理想范围，继续稳住';
  const over = value - target;
  if (value >= target * 1.35) return `已超出 ${over} kcal，后面优先选清淡、低油和高纤维食物`;
  return `已超出 ${over} kcal，下一餐可以清淡些`;
}

export function toneForWater(value: number, target: number) {
  if (value < target * 0.4) return '水分偏少，先补一杯';
  if (value < target) return '正在变好，再补一点就很稳';
  return '饮水目标已达成';
}

export function toneForRecords(value: number) {
  if (value === 0) return '等第一条记录';
  if (value < 5) return '今天已经开始留下线索';
  return '记录很完整，复盘会更准';
}
