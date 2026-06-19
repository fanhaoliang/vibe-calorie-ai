// HTTP API 出参 / 进参的形状。
// 与 server/contracts.js 中的 JSDoc typedef 保持一致；任何字段调整需要两边同步。

export type Summary = {
  date: string;
  totalCalories: number;
  waterTotalMl: number;
  foodEntryCount: number;
  waterEntryCount: number;
  weightKg: number | null;
  weightRecordedAt: string | null;
};

export type FoodItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  needReview: boolean;
  reviewReason: string;
};

export type WaterItem = {
  id: number;
  rawText: string;
  amountMl: number;
  needReview: boolean;
  reviewReason: string;
};

export type FoodEntry = {
  id: number;
  recordedAt: string;
  rawText: string;
  parseSource?: string;
  parseStatus?: string;
  llmTotalCalories?: number;
  finalTotalCalories: number;
  needReview: boolean;
  reviewReason: string;
  ignoredItems?: string[];
  foodItems: FoodItem[];
  waterItems: WaterItem[];
};

export type DraftFoodItem = Omit<FoodItem, 'id'> & { id?: number; rawText?: string };
export type DraftWaterItem = Omit<WaterItem, 'id'> & { id?: number };
export type FoodEntryDraft = Omit<FoodEntry, 'id' | 'foodItems' | 'waterItems'> & {
  id?: number;
  foodItems: DraftFoodItem[];
  waterItems: DraftWaterItem[];
};

export type WaterEntry = {
  id: number;
  recordedAt: string;
  rawText: string;
  amountMl: number;
  needReview: boolean;
  reviewReason: string;
};

export type DailyRow = Summary;

export type ChartPoint = {
  time: string;
  label: string;
  kcal: number;
  water: number;
  hasKcal: boolean;
  hasWater: boolean;
  isAnchor?: boolean;
};

export type BmiTrendPoint = {
  date: string;
  calories: number | null;
  rawCalories: number;
  isOutlier: boolean;
  weightKg: number;
  bmi: number;
  delta: number;
};
