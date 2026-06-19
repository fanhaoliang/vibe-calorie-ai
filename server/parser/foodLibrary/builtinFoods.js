// 内置食物库：170+ 种常见食物的默认单位和每单位热量。
// 数据维护在 ./data/builtinFoods.json，源码只负责加载。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const FOODS = JSON.parse(readFileSync(join(here, 'data', 'builtinFoods.json'), 'utf8'));
