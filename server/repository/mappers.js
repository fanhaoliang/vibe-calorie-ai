// SQLite 行 → 业务对象的转换。
// SQLite 用 INTEGER 0/1 表示布尔，业务层用 true/false。

export function toDbBool(value) {
  return value ? 1 : 0;
}

export function fromDbBool(value) {
  return Boolean(value);
}

export function mapFoodItem(row) {
  return {
    id: row.id,
    rawText: row.raw_text,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    calories: row.calories,
    status: row.status,
    needReview: fromDbBool(row.need_review),
    reviewReason: row.review_reason,
    source: row.source
  };
}

export function mapWaterItem(row) {
  return {
    id: row.id,
    rawText: row.raw_text,
    amountMl: row.amount_ml,
    status: row.status,
    needReview: fromDbBool(row.need_review),
    reviewReason: row.review_reason
  };
}

export function mapWeightEntry(row) {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    date: row.date,
    weightKg: row.weight_kg
  };
}

// 同一天可以保存多条体重记录，weight_entries 查询会用 AVG(weight_kg)；
// 这里负责把 AVG 结果保留一位小数，并对 null 做兼容。
export function mapWeightAverage(row) {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    date: row.date,
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Math.round(Number(row.weight_kg) * 10) / 10
  };
}
