import { applyFoodLibrary } from '../parser/foodLibrary.js';

/**
 * 把任意 parsed 草稿规范化成可信形状：
 *   - foodItems / waterItems 字段清洗、四舍五入、默认值
 *   - confirmed=true 时清掉所有 needReview 标记，把 source 改成 user_confirmed
 *   - waterItems 中 amountMl<=0 的会被过滤掉
 *
 * 用于 POST /food-entries/preview、recalculate、确认保存三处入口。
 */
export function normalizeParsedDraft(parsed, { confirmed = false } = {}) {
  const foodItems = Array.isArray(parsed?.foodItems) ? parsed.foodItems : [];
  const waterItems = Array.isArray(parsed?.waterItems) ? parsed.waterItems : [];
  const finalTotalCalories = foodItems.reduce((sum, item) => sum + Math.max(0, Math.round(Number(item.calories) || 0)), 0);
  const needReview = confirmed ? false : Boolean(parsed?.needReview);
  const reviewReason = confirmed ? '' : String(parsed?.reviewReason || '');

  return {
    parseSource: parsed?.parseSource || 'user_confirmed_preview',
    parseStatus: parsed?.parseStatus || (foodItems.length || waterItems.length ? 'success' : 'empty'),
    llmTotalCalories: Number(parsed?.llmTotalCalories ?? parsed?.totalCalories ?? finalTotalCalories) || finalTotalCalories,
    finalTotalCalories,
    needReview,
    reviewReason,
    ignoredItems: Array.isArray(parsed?.ignoredItems) ? parsed.ignoredItems : [],
    foodItems: foodItems.map(item => ({
      rawText: String(item.rawText || item.name || '').trim(),
      name: String(item.name || '').trim() || '未命名食物',
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      unit: String(item.unit || ''),
      calories: Math.max(0, Math.round(Number(item.calories) || 0)),
      status: item.status || 'recognized',
      needReview: confirmed ? false : Boolean(item.needReview),
      reviewReason: confirmed ? '' : String(item.reviewReason || ''),
      source: confirmed ? 'user_confirmed' : (item.source || 'llm')
    })),
    waterItems: waterItems.map(item => ({
      rawText: String(item.rawText || item.amountMl || '').trim() || `${Math.round(Number(item.amountMl) || 0)}ml`,
      amountMl: Math.max(0, Math.round(Number(item.amountMl) || 0)),
      status: item.status || 'recognized',
      needReview: confirmed ? false : Boolean(item.needReview),
      reviewReason: confirmed ? '' : String(item.reviewReason || '')
    })).filter(item => item.amountMl > 0)
  };
}

// 把食物项还原成"N 单位 名称"用于二次解析的 fallback 文本。
function buildFoodFallbackText(item) {
  const quantity = Number(item.quantity) > 0 ? item.quantity : 1;
  const unit = String(item.unit || '').trim();
  const name = String(item.name || item.rawText || '').trim();
  return `${quantity}${unit}${name}`.trim();
}

// food_library / user_library 来源的食物已经是 canonical 名称，
// 不需要再 fallback 到 LLM；其他来源（unmatched/llm/llm_fallback…）则尝试 fallback。
function needsFoodFallback(item) {
  return !['food_library', 'user_library'].includes(item.source);
}

/**
 * 用户编辑预览结果后重算热量。流程：
 *   1. normalize → 清洗字段
 *   2. applyFoodLibrary({preferName:true}) → 按 name 用食物库覆盖
 *   3. 对食物库没匹配上的项，逐个用 parser 二次估算（fallback）
 *   4. 重算 finalTotalCalories，并根据是否有项需确认更新顶层 needReview
 */
export async function recalculateParsedDraft(parsed, options = {}, parser, repo) {
  const normalized = normalizeParsedDraft(parsed, options);
  let recalculated = {
    ...normalized,
    ...applyFoodLibrary(normalized, { preferName: true })
  };

  if (!parser) return recalculated;

  const foodItems = await Promise.all(recalculated.foodItems.map(async item => {
    if (!needsFoodFallback(item)) return item;

    try {
      const fallbackText = buildFoodFallbackText(item);
      const fallback = normalizeParsedDraft(await parser(fallbackText, repo), options);
      const fallbackItem = fallback.foodItems[0];
      const calories = Math.round(Number(fallbackItem?.calories) || 0);

      if (calories > 0) {
        return {
          ...item,
          calories,
          status: 'estimated',
          needReview: options.confirmed ? false : true,
          reviewReason: options.confirmed ? '' : '食物库未匹配，已用模型估算',
          source: 'llm_fallback'
        };
      }
    } catch {
      // Keep the original estimate when fallback parsing is unavailable.
    }

    return {
      ...item,
      status: item.status || 'estimated',
      needReview: options.confirmed ? false : true,
      reviewReason: options.confirmed ? '' : '食物库和模型都未能匹配，保留原估算',
      source: item.source === 'unmatched' ? 'llm_fallback_failed' : item.source
    };
  }));

  const finalTotalCalories = foodItems.reduce((sum, item) => sum + Math.max(0, Math.round(Number(item.calories) || 0)), 0);
  const anyItemNeedsReview = foodItems.some(item => item.needReview);

  recalculated = {
    ...recalculated,
    foodItems,
    finalTotalCalories,
    llmTotalCalories: finalTotalCalories,
    needReview: options.confirmed ? false : (recalculated.needReview || anyItemNeedsReview),
    reviewReason: options.confirmed ? '' : (recalculated.reviewReason || (anyItemNeedsReview ? '食物库未匹配，已用模型估算' : ''))
  };

  return recalculated;
}
