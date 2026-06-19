// 食物名称常见叫法 → 标准名称的归一化映射表。
// 数据维护在 ./data/nameAliases.json，源码只负责加载。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, 'data', 'nameAliases.json'), 'utf8'));

export const FOOD_NAME_ALIASES = new Map(raw);
