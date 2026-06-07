// 当日趋势点构造：把饮食和饮水记录按 5 分钟粒度聚合到 08:30–20:30 时间桶里。
// 输出供 TodayCombinedChart 使用。

const START_MINUTES = 8 * 60 + 30;
const END_MINUTES = 20 * 60 + 30;
const STEP_MINUTES = 5;

type ChartBucket = {
  time: string;
  label: string;
  kcal: number;
  water: number;
  hasKcal: boolean;
  hasWater: boolean;
  isAnchor: boolean;
};

type EntryLike = {
  recordedAt: string;
  finalTotalCalories: number;
  waterItems: { amountMl: number }[];
};

type WaterLike = { recordedAt: string; amountMl: number };

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// 把 ISO 时间映射到时间桶的 minute key，并把超出 08:30–20:30 范围的截断到端点。
function bucketMinute(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const totalMinutes = hour * 60 + minute;
  const snapped = Math.round((totalMinutes - START_MINUTES) / STEP_MINUTES) * STEP_MINUTES + START_MINUTES;
  return Math.min(END_MINUTES, Math.max(START_MINUTES, snapped));
}

export function buildTodayPoints(entries: EntryLike[], waters: WaterLike[]) {
  const buckets = new Map<number, ChartBucket>();

  function ensureBucket(minute: number, isAnchor = false): ChartBucket {
    const existing = buckets.get(minute);
    if (existing) {
      existing.isAnchor = existing.isAnchor || isAnchor;
      return existing;
    }

    const label = formatMinute(minute);
    const point: ChartBucket = {
      time: label,
      label,
      kcal: 0,
      water: 0,
      hasKcal: false,
      hasWater: false,
      isAnchor
    };
    buckets.set(minute, point);
    return point;
  }

  // 起止时间锚点，保证图表横轴范围不漂移
  ensureBucket(START_MINUTES, true);
  ensureBucket(END_MINUTES, true);

  for (const entry of entries) {
    const point = ensureBucket(bucketMinute(entry.recordedAt));
    point.kcal += entry.finalTotalCalories;
    point.water += entry.waterItems.reduce((sum, item) => sum + item.amountMl, 0);
    if (entry.finalTotalCalories > 0) point.hasKcal = true;
    if (point.water > 0) point.hasWater = true;
  }

  for (const water of waters) {
    const point = ensureBucket(bucketMinute(water.recordedAt));
    point.water += water.amountMl;
    if (water.amountMl > 0) point.hasWater = true;
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([, point]) => point);
}
