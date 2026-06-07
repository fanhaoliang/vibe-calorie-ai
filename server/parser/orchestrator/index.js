import { ruleBasedParse } from '../ruleParser.js';
import { buildDiffResult } from './diffAnalysis.js';
import { validateJudgeResult } from './judgeValidation.js';
import {
  validateModelPayload,
  hasContent,
  finalize,
  markAllNeedReview,
  sumFoodCalories
} from './modelNormalize.js';

/**
 * 比较两个模型结果的最终热量是否一致。
 * 用于测试中的快速断言，不涉及差异分析和裁判逻辑。
 */
export function compareFinalCalories(modelA, modelB) {
  const aFinalTotalCalories = sumFoodCalories(modelA.foodItems);
  const bFinalTotalCalories = sumFoodCalories(modelB.foodItems);
  return {
    matches: aFinalTotalCalories === bFinalTotalCalories,
    a: { finalTotalCalories: aFinalTotalCalories },
    b: { finalTotalCalories: bFinalTotalCalories }
  };
}

/**
 * 多模型解析主编排入口。
 *
 * 流程：
 *   1. A/B 并行调用 Promise.allSettled + validateModelPayload
 *   2. 两者失败 → ruleBasedParse 兜底
 *   3. 单模型成功 → markAllNeedReview
 *   4. 双模型成功 → buildDiffResult 差异分析
 *   5. 共识 → 直接返回 A+B mergedResult
 *   6. 分歧 + 无裁判 → merge + markAllNeedReview
 *   7. 分歧 + 有裁判 → 调 judge → validateJudgeResult
 *   8. SUCCESS → 采用裁判；FALLBACK → 回退 merge；REVIEW → 采用裁判 + needReview
 *
 * options:
 *   callModelA(text)   async, 返回 LLM A 的解析结果
 *   callModelB(text)   async, 返回 LLM B 的解析结果
 *   callJudgeModel(text, diffInfo)  async, 返回裁判解析结果
 *   onDecision(event)  callback, 每次关键决策的日志记录点
 */
export async function parseWithModels(text, options = {}) {
  // --- 第一轮：A 和 B 并行解析 ---
  const [rawA, rawB] = await Promise.allSettled([
    options.callModelA?.(text),
    options.callModelB?.(text)
  ]);

  const modelA = rawA.status === 'fulfilled' ? validateModelPayload(rawA.value) : null;
  const modelB = rawB.status === 'fulfilled' ? validateModelPayload(rawB.value) : null;

  options.onDecision?.({
    type: 'round_1_complete',
    modelA_ok: hasContent(modelA),
    modelB_ok: hasContent(modelB),
    modelA_items: modelA?.foodItems?.length ?? 0,
    modelB_items: modelB?.foodItems?.length ?? 0,
    modelA_cal: modelA?.totalCalories ?? 0,
    modelB_cal: modelB?.totalCalories ?? 0
  });

  // 两者都失败 → 规则兜底
  if (!hasContent(modelA) && !hasContent(modelB)) {
    options.onDecision?.({ type: 'rule_fallback' });
    return {
      ...ruleBasedParse(text),
      parseSource: 'rule_fallback'
    };
  }

  // 只有一个成功 → 单模型回退
  if (!hasContent(modelA) || !hasContent(modelB)) {
    const selected = hasContent(modelA) ? modelA : modelB;
    const selectedModel = hasContent(modelA) ? 'A' : 'B';
    const parseSource = modelA?.parseStatus === 'empty' || modelB?.parseStatus === 'empty'
      ? 'single_model_effective'
      : 'single_model_fallback';
    options.onDecision?.({ type: parseSource, selected: selectedModel });
    return markAllNeedReview(
      finalize(selected, parseSource),
      parseSource === 'single_model_effective'
        ? '仅一个模型识别到内容，建议确认'
        : '仅一个模型解析成功，建议确认'
    );
  }

  // --- 差异分析 ---
  const aCovered = finalize(modelA, 'model_a');
  const bCovered = finalize(modelB, 'model_b');
  const diff = buildDiffResult(aCovered, bCovered);

  options.onDecision?.({
    type: 'diff_analysis',
    foodOverlap: diff.foodOverlap,
    overlapThreshold: diff.overlapThreshold,
    foodCountDiff: diff.foodCountDiff,
    consensus: diff.consensus,
    hasQuantityConflict: diff.hasQuantityConflict,
    hasCalorieConflict: diff.hasCalorieConflict,
    quantityDiffs: diff.quantityDiffs,
    calorieDiffs: diff.calorieDiffs,
    commonFoods: diff.commonFoods,
    onlyInA: diff.onlyInA,
    onlyInB: diff.onlyInB
  });

  // 共识直接返回
  if (diff.consensus) {
    options.onDecision?.({
      type: 'consensus',
      foodOverlap: diff.foodOverlap,
      foodCountDiff: diff.foodCountDiff
    });
    const merged = finalize(diff.mergedResult, 'consensus');
    return {
      ...merged,
      needReview: false,
      reviewReason: ''
    };
  }

  // --- 有分歧，进入第二层：裁判 ---
  if (!options.callJudgeModel) {
    options.onDecision?.({
      type: 'no_judge_fallback',
      foodOverlap: diff.foodOverlap,
      foodCountDiff: diff.foodCountDiff
    });
    return markAllNeedReview(
      finalize(diff.mergedResult, 'no_judge_fallback'),
      `A/B分歧(重叠度${diff.foodOverlap}，项数差${diff.foodCountDiff})，裁判不可用`
    );
  }

  options.onDecision?.({
    type: 'round_2_judge',
    foodOverlap: diff.foodOverlap,
    foodCountDiff: diff.foodCountDiff,
    commonFoods: diff.commonFoods,
    onlyInA: diff.onlyInA,
    onlyInB: diff.onlyInB
  });

  // 裁判只接收食物名称，不接收热量
  const judgeRaw = await options.callJudgeModel(text, {
    foodNamesA: diff.foodNamesA,
    foodNamesB: diff.foodNamesB,
    commonFoods: diff.commonFoods,
    onlyInA: diff.onlyInA,
    onlyInB: diff.onlyInB,
    modelATotalCalories: diff.modelATotalCalories,
    modelBTotalCalories: diff.modelBTotalCalories,
    modelAFoodItems: diff.modelAFoodItems,
    modelBFoodItems: diff.modelBFoodItems,
    quantityDiffs: diff.quantityDiffs,
    calorieDiffs: diff.calorieDiffs
  });

  const judgeResult = validateModelPayload(judgeRaw);

  if (!judgeResult) {
    options.onDecision?.({ type: 'judge_parse_failed' });
    return markAllNeedReview(
      finalize(diff.mergedResult, 'judge_parse_failed'),
      '裁判模型解析失败，回退到A/B合并结果'
    );
  }

  // --- 第三轮：校验裁判结果 ---
  const judgeCovered = {
    ...finalize(judgeResult, 'judge_model_candidate'),
    _originalText: text
  };

  options.onDecision?.({
    type: 'round_3_validate',
    judge_items: judgeCovered.foodItems.length,
    judge_cal: judgeCovered.finalTotalCalories,
    a_cal: aCovered.finalTotalCalories,
    b_cal: bCovered.finalTotalCalories
  });

  const validation = validateJudgeResult(judgeCovered, aCovered, bCovered);

  options.onDecision?.({
    type: 'validation_complete',
    status: validation.status,
    layer1: validation.layer1,
    layer2: validation.layer2,
    layer3: validation.layer3,
    layer4: validation.layer4,
    layer5: validation.layer5,
    layer6: validation.layer6
  });

  if (validation.status === 'SUCCESS') {
    options.onDecision?.({ type: 'judge_validated' });
    return finalize(judgeCovered, 'judge_model');
  }

  if (validation.status === 'FALLBACK') {
    options.onDecision?.({
      type: 'judge_fallback',
      reasons: validation.allReasons
    });
    return markAllNeedReview(
      finalize(diff.mergedResult, 'judge_fallback'),
      `裁判结果校验失败：${validation.allReasons.join('；')}`
    );
  }

  // REVIEW
  options.onDecision?.({
    type: 'judge_review',
    reasons: validation.allReasons
  });
  return markAllNeedReview(
    finalize(judgeCovered, 'judge_review'),
    `裁判结果需确认：${validation.allReasons.join('；')}`
  );
}