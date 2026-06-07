const UNIT_VOLUME_ML = {
  '杯': 250,
  '盒': 250,
  '瓶': 500
};

const FOOD_VOLUME_ML = {
  '牛奶': 250,
  '豆浆': 250,
  '咖啡': 250,
  '拿铁': 250,
  '摩卡': 250,
  '果汁': 250,
  '酸奶': 200,
  '奶茶': 500,
  '可乐': 500,
  '雪碧': 500,
  '芬达': 500,
  '啤酒': 500,
  '功能饮料': 500
};

function normalizeUnit(unit) {
  return String(unit || '').trim().toLowerCase();
}

function isMl(unit) {
  return normalizeUnit(unit) === 'ml' || unit === '毫升';
}

function isGram(unit) {
  return normalizeUnit(unit) === 'g' || unit === '克';
}

function portionVolumeMl(food) {
  return FOOD_VOLUME_ML[food.name] || UNIT_VOLUME_ML[food.defaultUnit] || null;
}

export function calorieMultiplier(food, unit, quantity = 1) {
  const q = Number(quantity) > 0 ? Number(quantity) : 1;

  if (isMl(unit)) {
    if (isMl(food.defaultUnit)) return q;
    const volumeMl = portionVolumeMl(food);
    return volumeMl ? q / volumeMl : q;
  }

  if (isGram(unit) && isGram(food.defaultUnit)) return q;

  return q;
}

export function calculateFoodCalories(food, unit, quantity = 1) {
  return Math.round(food.caloriesPerUnit * calorieMultiplier(food, unit, quantity));
}
