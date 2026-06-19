/**
 * 解析模型 prompt：把用户中文饮食输入解析成固定 JSON 结构。
 * Prompt 主体存放在 ./prompts/parse.md 与 ./prompts/judge.md，
 * 这里只做模板加载与占位符替换。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const PARSE_TEMPLATE = readFileSync(join(here, 'prompts', 'parse.md'), 'utf8');
const JUDGE_TEMPLATE = readFileSync(join(here, 'prompts', 'judge.md'), 'utf8');

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  );
}

export function buildParsePrompt(text) {
  return fillTemplate(PARSE_TEMPLATE, { TEXT: text });
}

function formatJudgeFoodItems(items = []) {
  if (!items.length) return '- none';
  return items.map(item => (
    `- rawText="${item.rawText}", name="${item.name}", quantity=${item.quantity}${item.unit}, calories=${item.calories}, status=${item.status}`
  )).join('\n');
}

function formatJudgeDiffs(diffs = []) {
  if (!diffs.length) return '- none';
  return diffs.map(diff => `- ${JSON.stringify(diff)}`).join('\n');
}

/**
 * 裁判模型 prompt：在 A/B 分歧时调用。
 *
 * 设计要点：
 *   - 第一阶段不允许看弱提醒，强制独立解析
 *   - 第二阶段才暴露弱提醒，但补充必须有原文证据
 *   - 第三阶段自我审计可能的漏 / 重 / 创造
 * 这样裁判既不会被 A/B 误导，也能借助它们的提示发现自己的遗漏。
 */
export function buildJudgePrompt(text, diffInfo) {
  const {
    commonFoods,
    onlyInA,
    onlyInB,
    modelATotalCalories = 0,
    modelBTotalCalories = 0,
    modelAFoodItems = [],
    modelBFoodItems = [],
    quantityDiffs = [],
    calorieDiffs = []
  } = diffInfo;

  const hintItems = [
    ...(commonFoods?.length ? [`共同识别：${commonFoods.join('、')}`] : []),
    ...(onlyInA?.length ? [`仅A识别：${onlyInA.join('、')}`] : []),
    ...(onlyInB?.length ? [`仅B识别：${onlyInB.join('、')}`] : [])
  ];

  const hintSection = hintItems.length > 0
    ? `【弱提醒：其他模型识别到的食物（仅供参考，可能有误）】\n${hintItems.join('\n')}`
    : '【无弱提醒】';

  const candidateSection = `【A/B 候选证据：仅用于审计对比，不是最终答案】
A 总热量：${modelATotalCalories} kcal
${formatJudgeFoodItems(modelAFoodItems)}

B 总热量：${modelBTotalCalories} kcal
${formatJudgeFoodItems(modelBFoodItems)}

数量/单位冲突：
${formatJudgeDiffs(quantityDiffs)}

热量冲突：
${formatJudgeDiffs(calorieDiffs)}

审计要求：如果 A/B 热量差异明显，必须结合原始输入、数量、单位、做法和常见份量重新判断；不要简单取平均值。`;

  return fillTemplate(JUDGE_TEMPLATE, {
    TEXT: text,
    HINT_SECTION: hintSection,
    CANDIDATE_SECTION: candidateSection
  });
}
