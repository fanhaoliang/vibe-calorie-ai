const PARSE_STATUSES = new Set(['success', 'partial', 'empty', 'failed']);
const FOOD_STATUSES = new Set(['recognized', 'estimated', 'unknown', 'ambiguous', 'non_food']);
const WATER_STATUSES = new Set(['recognized', 'estimated', 'unknown', 'ambiguous']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateFoodItem(item) {
  if (!isPlainObject(item)) return null;
  if (typeof item.rawText !== 'string' || !item.rawText.trim()) return null;
  if (typeof item.name !== 'string' || !item.name.trim()) return null;
  if (typeof item.quantity !== 'number' || item.quantity <= 0) return null;
  if (typeof item.unit !== 'string') return null;
  if (typeof item.calories !== 'number' || item.calories < 0) return null;
  if (!FOOD_STATUSES.has(item.status)) return null;
  if (typeof item.needReview !== 'boolean') return null;
  if (typeof item.reviewReason !== 'string') return null;
  return {
    rawText: item.rawText.trim(),
    name: item.name.trim(),
    quantity: item.quantity,
    unit: item.unit.trim(),
    calories: Math.round(item.calories),
    status: item.status,
    needReview: item.needReview,
    reviewReason: item.reviewReason
  };
}

function validateWaterItem(item) {
  if (!isPlainObject(item)) return null;
  if (typeof item.rawText !== 'string' || !item.rawText.trim()) return null;
  if (typeof item.amountMl !== 'number' || item.amountMl <= 0) return null;
  if (!WATER_STATUSES.has(item.status)) return null;
  if (typeof item.needReview !== 'boolean') return null;
  if (typeof item.reviewReason !== 'string') return null;
  return {
    rawText: item.rawText.trim(),
    amountMl: Math.round(item.amountMl),
    status: item.status,
    needReview: item.needReview,
    reviewReason: item.reviewReason
  };
}

export function validateLLMResult(payload) {
  if (!isPlainObject(payload)) {
    return { ok: false, error: 'Result must be a JSON object' };
  }
  if (!PARSE_STATUSES.has(payload.parseStatus)) {
    return { ok: false, error: 'Invalid parseStatus' };
  }
  if (typeof payload.totalCalories !== 'number' || payload.totalCalories < 0) {
    return { ok: false, error: 'Invalid totalCalories' };
  }
  if (typeof payload.needReview !== 'boolean') {
    return { ok: false, error: 'Invalid needReview' };
  }
  if (typeof payload.reviewReason !== 'string') {
    return { ok: false, error: 'Invalid reviewReason' };
  }
  if (!Array.isArray(payload.foodItems) || !Array.isArray(payload.waterItems) || !Array.isArray(payload.ignoredItems)) {
    return { ok: false, error: 'Items must be arrays' };
  }

  const foodItems = payload.foodItems.map(validateFoodItem);
  const waterItems = payload.waterItems.map(validateWaterItem);
  if (foodItems.some(item => item === null) || waterItems.some(item => item === null)) {
    return { ok: false, error: 'Invalid item shape' };
  }

  return {
    ok: true,
    value: {
      parseStatus: payload.parseStatus,
      totalCalories: Math.round(payload.totalCalories),
      needReview: payload.needReview,
      reviewReason: payload.reviewReason,
      foodItems,
      waterItems,
      ignoredItems: payload.ignoredItems.map(item => String(item))
    }
  };
}
