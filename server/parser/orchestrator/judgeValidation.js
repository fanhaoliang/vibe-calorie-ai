import { getCalorieRange, normalizeFoodName } from '../foodLibrary.js';
import { fuzzyMatch } from './fuzzyMatch.js';
import { normalizeModelFoodItems } from './modelNormalize.js';

/**
 * L1–L6 校验引擎：在裁判返回结果后验证其可信度。
 *
 *   L1  裁判是否遗漏 A/B 共识食物
 *   L2  （默认关闭）单项热量是否在知识库合理区间
 *   L3  裁判总热量是否在 A/B 区间内（收紧策略）
 *   L4  （默认关闭）项数/单项热量是否异常偏离 A/B
 *   L5  食物 rawText 是否在原文中存在
 *   L6  食物 name 与 rawText 是否一致（防过度拆分）
 *
 * 综合判定：
 *   L1 + L3 必须通过 → SUCCESS
 *   L3 失败 → FALLBACK（致命，回退 A+B 合并）
 *   其余 → REVIEW（采用裁判但标记需确认）
 */
export function validateJudgeResult(judgeCovered, modelA, modelB) {
  const report = {
    status: 'SUCCESS',
    needReview: false,
    layer1: { pass: true, reasons: [] },
    layer2: { pass: true, reasons: [] },
    layer3: { pass: true, reasons: [] },
    layer4: { pass: true, reasons: [] },
    layer5: { pass: true, reasons: [] },
    layer6: { pass: true, reasons: [] }
  };

  // --- L1: 共同食物遗漏检查 ---
  const aNorms = modelA.foodItems.map(i => normalizeFoodName(i.name));
  const bNorms = modelB.foodItems.map(i => normalizeFoodName(i.name));
  const commonFoods = aNorms.filter((an, idx) =>
    bNorms.some(bn => fuzzyMatch(an, bn)) && an
  );
  const judgeNorms = judgeCovered.foodItems.map(i => normalizeFoodName(i.name));

  const missedCommon = commonFoods.filter(cf =>
    !judgeNorms.some(jn => fuzzyMatch(cf, jn))
  );
  if (missedCommon.length > 0) {
    report.layer1.pass = false;
    report.layer1.reasons.push(`裁判遗漏了共识食物：${missedCommon.join('、')}`);
  }

  // --- L2: 单项热量知识库范围（默认关闭） ---
  for (const item of judgeCovered.foodItems) {
    const range = getCalorieRange(item.name, item.unit, item.quantity);
    if (range) {
      if (item.calories < range.min || item.calories > range.max) {
        report.layer2.pass = false;
        report.layer2.reasons.push(
          `${item.name}(${item.quantity}${item.unit})热量${item.calories}kcal超出知识库范围[${range.min},${range.max}]`
        );
      }
    }
  }

  // --- L3: 总热量合理区间（收紧） ---
  const aCal = modelA.finalTotalCalories;
  const bCal = modelB.finalTotalCalories;
  const jCal = judgeCovered.finalTotalCalories;
  const minCal = Math.min(aCal, bCal);
  const maxCal = Math.max(aCal, bCal);
  const margin = (maxCal - minCal) * 1.2 + 100;

  if (jCal < minCal - margin || jCal > maxCal + margin) {
    report.layer3.pass = false;
    report.layer3.reasons.push(
      `裁判总热量${jCal}kcal超出合理区间[${minCal - margin},${maxCal + margin}]`
    );
  }

  // --- L4: 异常值检测（默认关闭） ---
  const minItems = Math.min(modelA.foodItems.length, modelB.foodItems.length);
  const maxItems = Math.max(modelA.foodItems.length, modelB.foodItems.length);

  if (judgeCovered.foodItems.length < minItems - 2) {
    report.layer4.pass = false;
    report.layer4.reasons.push(
      `裁判项数(${judgeCovered.foodItems.length})远少于模型(${minItems}~${maxItems})`
    );
  }
  if (judgeCovered.foodItems.length > maxItems + 3) {
    report.layer4.pass = false;
    report.layer4.reasons.push(
      `裁判项数(${judgeCovered.foodItems.length})远多于模型，可能有过度拆分`
    );
  }
  for (const jItem of judgeCovered.foodItems) {
    const aItem = modelA.foodItems.find(ai => fuzzyMatch(ai.name, jItem.name));
    const bItem = modelB.foodItems.find(bi => fuzzyMatch(bi.name, jItem.name));
    if (aItem && bItem) {
      const avgCal = (aItem.calories + bItem.calories) / 2;
      const maxDev = Math.max(
        Math.abs(aItem.calories - avgCal),
        Math.abs(bItem.calories - avgCal)
      ) * 2 + 50;
      if (Math.abs(jItem.calories - avgCal) > maxDev) {
        report.layer4.pass = false;
        report.layer4.reasons.push(
          `${jItem.name}热量${jItem.calories}与A/B均值${Math.round(avgCal)}偏差>${Math.round(maxDev)}`
        );
      }
    }
  }

  // --- L5: 原始文本覆盖度检查 ---
  const originalText = String(judgeCovered._originalText || '');
  for (const item of judgeCovered.foodItems) {
    const rawText = String(item.rawText || '');
    const name = String(item.name || '');
    if (originalText && !originalText.includes(rawText) && !originalText.includes(name)) {
      report.layer5.pass = false;
      report.layer5.reasons.push(
        `${item.name} 的原始文本 "${rawText}" 在原文中未找到`
      );
    }
  }

  // --- L6: 食物名称一致性检查（防过度拆分） ---
  for (const item of judgeCovered.foodItems) {
    const rawText = String(item.rawText || '');
    const name = String(item.name || '');
    if (rawText && name && !rawText.includes(name) && !name.includes(rawText)) {
      const cleaned = rawText.replace(/^\d+[\.\d]*\s*(个|根|片|块|碗|杯|份|盘|盒|包|瓶|袋|克|g|毫升|ml|勺|串|颗|瓣)\s*/, '');
      if (!cleaned.includes(name) && !name.includes(cleaned)) {
        report.layer6.pass = false;
        report.layer6.reasons.push(
          `${item.name} 与原始文本 "${item.rawText}" 不一致，可能存在过度拆分`
        );
      }
    }
  }

  // --- 综合判定 ---
  const L2_ENABLED = process.env.L2_ENABLED === 'true';
  const L4_ENABLED = process.env.L4_ENABLED === 'true';

  const l1Pass = report.layer1.pass;
  const l2Pass = L2_ENABLED ? report.layer2.pass : true;
  const l3Pass = report.layer3.pass;
  const l4Pass = L4_ENABLED ? report.layer4.pass : true;
  const l5Pass = report.layer5.pass;
  const l6Pass = report.layer6.pass;

  const allPass = l1Pass && l2Pass && l3Pass && l4Pass && l5Pass && l6Pass;
  const hasFatal = !l3Pass;

  if (allPass) {
    report.status = 'SUCCESS';
    report.needReview = false;
  } else if (hasFatal) {
    report.status = 'FALLBACK';
    report.needReview = true;
  } else {
    report.status = 'REVIEW';
    report.needReview = true;
  }

  report.allReasons = [
    ...report.layer1.reasons,
    ...(L2_ENABLED ? report.layer2.reasons : []),
    ...report.layer3.reasons,
    ...(L4_ENABLED ? report.layer4.reasons : []),
    ...report.layer5.reasons,
    ...report.layer6.reasons
  ];

  return report;
}