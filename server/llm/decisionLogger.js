import { logReadable } from '../logger.js';
import { getModelDisplayName } from './modelConfig.js';

/**
 * 把 orchestrator 抛出的 decision 事件翻译成人类可读的中文日志。
 *
 * orchestrator 内部触发 onDecision 的时机由 parseWithModels 决定：
 *   round_1_complete       A/B 都返回后
 *   diff_analysis          差异分析完成
 *   consensus              共识通过（不调裁判）
 *   round_2_judge          调用裁判前
 *   round_3_validate       裁判返回后开始 L1-L6 校验
 *   validation_complete    校验完成，给出 status 与每层 pass
 *   judge_validated        采用裁判结果
 *   judge_review           采用裁判但标记需确认
 *   judge_fallback         校验 fatal，回退 A+B 合并
 *   judge_parse_failed     裁判 payload 校验失败
 *   no_judge_fallback      A/B 分歧但裁判不可用
 *   single_model_fallback  只有一个模型成功
 *   single_model_effective 只有一个模型识别到内容
 *   rule_fallback          所有模型都不可用
 */
export function createDecisionLogger(modelA, modelB) {
  const modelNames = {
    A: modelA ? getModelDisplayName('LLM_A', modelA.model) : '模型 A',
    B: modelB ? getModelDisplayName('LLM_B', modelB.model) : '模型 B'
  };

  return decision => {
    switch (decision.type) {
      case 'round_1_complete':
        logReadable('llm', `第一轮完成：A 识别 ${decision.modelA_items} 项(${decision.modelA_cal}kcal)，B 识别 ${decision.modelB_items} 项(${decision.modelB_cal}kcal)`);
        return;

      case 'diff_analysis':
        logReadable('llm', `差异分析：重叠度${decision.foodOverlap}，项数差${decision.foodCountDiff}，共识=${decision.consensus}；共有[${decision.commonFoods.join(',') || '无'}]，A独有[${decision.onlyInA.join(',') || '无'}]，B独有[${decision.onlyInB.join(',') || '无'}]`);
        return;

      case 'consensus':
        logReadable('llm', `共识通过：重叠度${decision.foodOverlap}，项数差${decision.foodCountDiff}，直接返回合并结果`);
        return;

      case 'round_2_judge':
        logReadable('llm', `第二轮：调用裁判模型，重叠度${decision.foodOverlap}，项数差${decision.foodCountDiff}；共有[${decision.commonFoods.join(',') || '无'}]，A独有[${decision.onlyInA.join(',') || '无'}]，B独有[${decision.onlyInB.join(',') || '无'}]`);
        return;

      case 'round_3_validate':
        logReadable('llm', `第三轮验证：裁判识别 ${decision.judge_items} 项(${decision.judge_cal}kcal)，A(${decision.a_cal}kcal) B(${decision.b_cal}kcal)`);
        return;

      case 'validation_complete': {
        const l5 = decision.layer5 || { pass: true };
        const l6 = decision.layer6 || { pass: true };
        logReadable('llm', `校验完成：status=${decision.status}；L1=${decision.layer1.pass ? 'PASS' : 'FAIL'} L2=${decision.layer2.pass ? 'PASS' : 'FAIL'} L3=${decision.layer3.pass ? 'PASS' : 'FAIL'} L4=${decision.layer4.pass ? 'PASS' : 'FAIL'} L5=${l5.pass ? 'PASS' : 'FAIL'} L6=${l6.pass ? 'PASS' : 'FAIL'}`);
        return;
      }

      case 'judge_validated':
        logReadable('llm', '裁判模型结果通过验证，最终采用裁判结果');
        return;

      case 'judge_review':
        logReadable('llm', `裁判结果需确认：${decision.reasons.join('；')}，仍采用但标记需确认`);
        return;

      case 'judge_fallback':
        logReadable('llm', `裁判结果校验失败：${decision.reasons.join('；')}，回退到A+B合并结果`);
        return;

      case 'judge_parse_failed':
        logReadable('llm', '裁判模型解析失败，回退到 A+B 合并结果');
        return;

      case 'no_judge_fallback':
        logReadable('llm', `A+B分歧(重叠度${decision.foodOverlap}，项数差${decision.foodCountDiff})但裁判不可用，合并结果标记需确认`);
        return;

      case 'single_model_fallback':
        logReadable('llm', `仅 ${modelNames[decision.selected]} 成功，本次采用单模型结果，建议人工确认`);
        return;

      case 'single_model_effective':
        logReadable('llm', `仅 ${modelNames[decision.selected]} 识别到内容，本次采用它的结果，建议人工确认`);
        return;

      case 'rule_fallback':
        logReadable('llm', '所有模型都未返回有效结果，改用本地规则解析');
        return;
    }
  };
}
