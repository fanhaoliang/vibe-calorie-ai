import { getCalorieRange, normalizeFoodName } from '../foodLibrary.js';
import { fuzzyMatch } from './fuzzyMatch.js';

/**
 * L1–L6 校验引擎：在裁判返回结果后验证其可信度。
 *
 * 每条规则用 LAYERS 数组里的对象描述：
 *   id        layerN，写入 report.layerN
 *   fatal     true 表示失败属致命，结果应回退（FALLBACK）
 *   alwaysOn  true 表示不受 enabledByEnv 影响（默认开启）
 *   enabledByEnv  环境变量名，仅 alwaysOn=false 时生效
 *   run(ctx)  返回 { pass, reasons }
 *
 * 综合判定：
 *   有任何 fatal 且未通过的 → FALLBACK
 *   全部启用规则通过        → SUCCESS
 *   其余                    → REVIEW
 */
const LAYERS = [
  {
    id: 'layer1',
    fatal: false,
    alwaysOn: true,
    run: ({ commonFoods, judgeNorms }) => {
      const reasons = [];
      const missedCommon = commonFoods.filter(cf =>
        !judgeNorms.some(jn => fuzzyMatch(cf, jn))
      );
      if (missedCommon.length > 0) {
        reasons.push(`裁判遗漏了共识食物：${missedCommon.join('、')}`);
      }
      return { pass: reasons.length === 0, reasons };
    }
  },
  {
    id: 'layer2',
    fatal: false,
    alwaysOn: false,
    enabledByEnv: 'L2_ENABLED',
    run: ({ judgeCovered }) => {
      const reasons = [];
      for (const item of judgeCovered.foodItems) {
        const range = getCalorieRange(item.name, item.unit, item.quantity);
        if (range && (item.calories < range.min || item.calories > range.max)) {
          reasons.push(
            `${item.name}(${item.quantity}${item.unit})热量${item.calories}kcal超出知识库范围[${range.min},${range.max}]`
          );
        }
      }
      return { pass: reasons.length === 0, reasons };
    }
  },
  {
    id: 'layer3',
    fatal: true,
    alwaysOn: true,
    run: ({ judgeCovered, modelA, modelB }) => {
      const reasons = [];
      const aCal = modelA.finalTotalCalories;
      const bCal = modelB.finalTotalCalories;
      const jCal = judgeCovered.finalTotalCalories;
      const minCal = Math.min(aCal, bCal);
      const maxCal = Math.max(aCal, bCal);
      const margin = (maxCal - minCal) * 1.2 + 100;

      if (jCal < minCal - margin || jCal > maxCal + margin) {
        reasons.push(
          `裁判总热量${jCal}kcal超出合理区间[${minCal - margin},${maxCal + margin}]`
        );
      }
      return { pass: reasons.length === 0, reasons };
    }
  },
  {
    id: 'layer4',
    fatal: false,
    alwaysOn: false,
    enabledByEnv: 'L4_ENABLED',
    run: ({ judgeCovered, modelA, modelB }) => {
      const reasons = [];
      const minItems = Math.min(modelA.foodItems.length, modelB.foodItems.length);
      const maxItems = Math.max(modelA.foodItems.length, modelB.foodItems.length);

      if (judgeCovered.foodItems.length < minItems - 2) {
        reasons.push(
          `裁判项数(${judgeCovered.foodItems.length})远少于模型(${minItems}~${maxItems})`
        );
      }
      if (judgeCovered.foodItems.length > maxItems + 3) {
        reasons.push(
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
            reasons.push(
              `${jItem.name}热量${jItem.calories}与A/B均值${Math.round(avgCal)}偏差>${Math.round(maxDev)}`
            );
          }
        }
      }
      return { pass: reasons.length === 0, reasons };
    }
  },
  {
    id: 'layer5',
    fatal: false,
    alwaysOn: true,
    run: ({ judgeCovered }) => {
      const reasons = [];
      const originalText = String(judgeCovered._originalText || '');
      for (const item of judgeCovered.foodItems) {
        const rawText = String(item.rawText || '');
        const name = String(item.name || '');
        if (originalText && !originalText.includes(rawText) && !originalText.includes(name)) {
          reasons.push(`${item.name} 的原始文本 "${rawText}" 在原文中未找到`);
        }
      }
      return { pass: reasons.length === 0, reasons };
    }
  },
  {
    id: 'layer6',
    fatal: false,
    alwaysOn: true,
    run: ({ judgeCovered }) => {
      const reasons = [];
      for (const item of judgeCovered.foodItems) {
        const rawText = String(item.rawText || '');
        const name = String(item.name || '');
        if (rawText && name && !rawText.includes(name) && !name.includes(rawText)) {
          const cleaned = rawText.replace(/^\d+[\.\d]*\s*(个|根|片|块|碗|杯|份|盘|盒|包|瓶|袋|克|g|毫升|ml|勺|串|颗|瓣)\s*/, '');
          if (!cleaned.includes(name) && !name.includes(cleaned)) {
            reasons.push(
              `${item.name} 与原始文本 "${item.rawText}" 不一致，可能存在过度拆分`
            );
          }
        }
      }
      return { pass: reasons.length === 0, reasons };
    }
  }
];

function isLayerEnabled(layer) {
  if (layer.alwaysOn) return true;
  return process.env[layer.enabledByEnv] === 'true';
}

export function validateJudgeResult(judgeCovered, modelA, modelB) {
  const aNorms = modelA.foodItems.map(i => normalizeFoodName(i.name));
  const bNorms = modelB.foodItems.map(i => normalizeFoodName(i.name));
  const commonFoods = aNorms.filter(an => bNorms.some(bn => fuzzyMatch(an, bn)) && an);
  const judgeNorms = judgeCovered.foodItems.map(i => normalizeFoodName(i.name));

  const ctx = { judgeCovered, modelA, modelB, commonFoods, judgeNorms };

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

  let hasFatal = false;
  let allPass = true;
  const allReasons = [];

  for (const layer of LAYERS) {
    const enabled = isLayerEnabled(layer);
    if (!enabled) continue;

    const result = layer.run(ctx);
    report[layer.id] = result;

    if (!result.pass) {
      allPass = false;
      if (layer.fatal) hasFatal = true;
      allReasons.push(...result.reasons);
    }
  }

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

  report.allReasons = allReasons;
  return report;
}
