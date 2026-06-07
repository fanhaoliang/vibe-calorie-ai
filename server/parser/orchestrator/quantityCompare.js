// 单位归一化映射（同含义的不同文字表示 → 标准符）。
const UNIT_MAP = {
  'g': 'g', '克': 'g',
  'ml': 'ml', '毫升': 'ml',
  '个': '个', '根': '根', '片': '片', '块': '块',
  '碗': '碗', '杯': '杯', '份': '份', '盘': '盘',
  '盒': '盒', '包': '包', '瓶': '瓶', '袋': '袋',
  '串': '串', '颗': '颗', '瓣': '瓣', '勺': '勺'
};

/**
 * 比较两个模型中同一个食物的数量/单位差异度。
 *
 * 单位通过 UNIT_MAP 归一化后比较；单位不同时尝试已知换算（ml↔杯↔瓶）。
 * 同单位时比较数量比例的差异，diffRatio ≤ 0.3 视为 isMatch。
 *
 * @returns {{ isMatch: boolean, diffRatio: number, reason: string }}
 */
export function compareQuantityUnit(aItem, bItem) {
  const aUnit = UNIT_MAP[aItem.unit] || aItem.unit;
  const bUnit = UNIT_MAP[bItem.unit] || bItem.unit;

  if (aUnit !== bUnit) {
    // ml ↔ 杯（1杯≈250ml）
    if ((aUnit === 'ml' && bUnit === '杯') || (aUnit === '杯' && bUnit === 'ml')) {
      const aMl = aUnit === 'ml' ? aItem.quantity : aItem.quantity * 250;
      const bMl = bUnit === 'ml' ? bItem.quantity : bItem.quantity * 250;
      const diffRatio = Math.abs(aMl - bMl) / Math.max(aMl, bMl);
      return { isMatch: diffRatio <= 0.3, diffRatio, reason: `单位不同(${aItem.unit}↔${bItem.unit})` };
    }
    // ml ↔ 瓶（1瓶≈500ml）
    if ((aUnit === 'ml' && bUnit === '瓶') || (aUnit === '瓶' && bUnit === 'ml')) {
      const aMl = aUnit === 'ml' ? aItem.quantity : aItem.quantity * 500;
      const bMl = bUnit === 'ml' ? bItem.quantity : bItem.quantity * 500;
      const diffRatio = Math.abs(aMl - bMl) / Math.max(aMl, bMl);
      return { isMatch: diffRatio <= 0.3, diffRatio, reason: `单位不同(${aItem.unit}↔${bItem.unit})` };
    }
    // g ↔ 个 不可比 → 直接算分歧
    if ((aUnit === 'g' && bUnit === '个') || (aUnit === '个' && bUnit === 'g')) {
      return { isMatch: false, diffRatio: 1, reason: `单位不可比(${aItem.unit}↔${bItem.unit})` };
    }
    return { isMatch: false, diffRatio: 1, reason: `单位不同(${aItem.unit}↔${bItem.unit})` };
  }

  const diffRatio = Math.abs(aItem.quantity - bItem.quantity) / Math.max(aItem.quantity, bItem.quantity);
  return { isMatch: diffRatio <= 0.3, diffRatio, reason: `数量差异${Math.round(diffRatio * 100)}%` };
}