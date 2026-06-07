/**
 * 解析模型 prompt：把用户中文饮食输入解析成固定 JSON 结构。
 *
 * 这个 prompt 同时被 LLM_A 和 LLM_B 用作 user message；
 * 输出契约与 server/parser/schema.js 中的 validateLLMResult 严格对齐。
 */
export function buildParsePrompt(text) {
  return `你是一个饮食热量解析助手。用户输入一段中文饮食记录，你需要：

1. 拆分出每个食物项和饮水项
2. 识别数量、单位、食物名称
3. 估算每项食物热量（kcal）
4. 纯水（零热量）+ 无热量饮品放入 waterItems
5. 含热量的饮品（牛奶、豆浆、奶茶、果汁、可乐等）应放入 foodItems，并正常估算热量
6. 无关内容放入 ignoredItems

返回固定 JSON object，格式必须如下：
{
  "parseStatus": "success",
  "totalCalories": 0,
  "needReview": false,
  "reviewReason": "",
  "foodItems": [
    {
      "rawText": "2个鸡蛋",
      "name": "鸡蛋",
      "quantity": 2,
      "unit": "个",
      "calories": 140,
      "status": "recognized",
      "needReview": false,
      "reviewReason": ""
    }
  ],
  "waterItems": [
    {
      "rawText": "一瓶水",
      "amountMl": 500,
      "status": "estimated",
      "needReview": true,
      "reviewReason": "按常见瓶装水估算为 500ml"
    }
  ],
  "ignoredItems": []
}

规则：
- 数量省略时默认为 1
- 保留用户原始食物名，例如"大包子"不要改写成"包子"
- 热量是常见估算值，不需要精确到营养数据库级别
- 如果用户提到烹饪方式，必须据此调整热量：油炸/煎制通常比基础食材高 30-50%，红烧/酱制通常高 20-30%，清蒸/水煮按基础值或略低；不要把炸鸡排、煎蛋、红烧肉按生肉或水煮基准估算
- totalCalories 只包含食物热量，不包含饮水
- 饮水量不明确时可以估算，但必须标记 needReview=true
- 无法识别的食物 status 设为 unknown，calories 设为 0
- 无关内容进入 ignoredItems
- 只返回 JSON object，不要解释文字，不要 markdown 代码块
- status 只能是 recognized、estimated、unknown、ambiguous、non_food
- parseStatus 只能是 success、partial、empty、failed

示例：
用户输入：一个包子，2个鸡蛋，喝了一瓶水
返回：{"parseStatus":"partial","totalCalories":360,"needReview":true,"reviewReason":"饮水量为估算","foodItems":[{"rawText":"一个包子","name":"包子","quantity":1,"unit":"个","calories":220,"status":"recognized","needReview":false,"reviewReason":""},{"rawText":"2个鸡蛋","name":"鸡蛋","quantity":2,"unit":"个","calories":140,"status":"recognized","needReview":false,"reviewReason":""}],"waterItems":[{"rawText":"一瓶水","amountMl":500,"status":"estimated","needReview":true,"reviewReason":"按常见瓶装水估算为 500ml"}],"ignoredItems":[]}

用户输入：
${text}`;
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

  return `你是一个极度严谨的饮食热量审计专家。你的唯一可信来源是【原始输入】。

【原始输入】
${text}

${hintSection}

${candidateSection}

===== 第一阶段：完全独立解析 =====

此阶段你**完全看不到**上方弱提醒。你只能看【原始输入】。

步骤：
1. 逐字阅读【原始输入】
2. 识别每一个独立的食物项
3. 提取 rawText、name、quantity、unit
4. 估算每项 calories（基于你的常识）
5. 识别饮水项，放入 waterItems
6. 无关内容放入 ignoredItems
7. 计算 totalCalories

**关键原则（此阶段严格遵守）：**
- 不看弱提醒
- 不猜测
- 不创造
- 不拆分复合食物（如"鸡蛋灌饼"就是一个整体）
- "一些肉菜""一点炒菜"不要拆成具体食材
- 数量省略时默认为 1
- 保留用户原始食物名（"大包子"不要改成"包子"）

===== 第二阶段：检查遗漏 =====

现在你可以看上方【弱提醒】了。

步骤：
1. 对比弱提醒和你第一阶段的结果
2. 检查你是否遗漏了明显存在的食物
3. **如果弱提醒中有你遗漏的食物，你必须回到【原始输入】验证**
4. 只有在原文中找到明确证据，才能补充
5. 如果原文中没有明确证据，即使A/B都提到了，也不补充
6. 如果弱提醒中有但原文中没有的食物，坚决不添加

**关键原则：**
- 弱提醒只是"提醒"，不是"答案"
- 补充必须有原文证据
- 宁可漏掉，不要创造

===== 第三阶段：自我审计 =====

检查以下问题并自动修正：
1. 遗漏主食/主要食物？
2. 重复添加同一食物？
3. 添加了原文完全不存在的食物？（最致命，必须修正）
4. 数量或单位明显不合理？
5. 单项或总热量明显异常？

===== 饮水处理 =====
- 纯水是零热量，不计入 totalCalories。纯水放入 waterItems
- "一瓶水"约 500ml，"一杯水"约 250ml，"一罐可乐"约 330ml
- 含热量的饮品（牛奶、豆浆、奶茶、果汁、可乐等）放入 foodItems，正常估算热量
- 饮水量不明确时估算并标记 needReview=true

===== 输出要求 =====
- 只输出 JSON，不要任何其他文字
- 格式如下：

{
  "parseStatus": "success",
  "totalCalories": 0,
  "needReview": false,
  "reviewReason": "",
  "foodItems": [
    {
      "rawText": "2个鸡蛋",
      "name": "鸡蛋",
      "quantity": 2,
      "unit": "个",
      "calories": 140,
      "status": "recognized",
      "needReview": false,
      "reviewReason": ""
    }
  ],
  "waterItems": [
    {
      "rawText": "一瓶水",
      "amountMl": 500,
      "status": "estimated",
      "needReview": true,
      "reviewReason": "按常见瓶装水估算为 500ml"
    }
  ],
  "ignoredItems": []
}

- status 只能是 recognized、estimated、unknown、ambiguous、non_food
- parseStatus 只能是 success、partial、empty、failed

现在开始处理。`;
}
