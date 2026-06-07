import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

/**
 * 服务 public/ 下的前端构建产物 + 少量从 node_modules 暴露的第三方库。
 *
 * vendorMap 把固定 URL 重写到 node_modules 内的具体文件，
 * 保证不会有任意路径穿越 node_modules 任意文件——只有 publicRoot
 * 和 vendorRoot 两个白名单根路径下的文件才会被返回。
 */
export function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const vendorMap = new Map([
    ['/vendor/vue.global.prod.js', join(process.cwd(), 'node_modules', 'vue', 'dist', 'vue.global.prod.js')],
    ['/vendor/chart.umd.min.js', join(process.cwd(), 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js')]
  ]);
  const filePath = vendorMap.get(requested) || normalize(join(process.cwd(), 'public', requested));
  const publicRoot = normalize(join(process.cwd(), 'public'));
  const vendorRoot = normalize(join(process.cwd(), 'node_modules'));

  if ((!filePath.startsWith(publicRoot) && !filePath.startsWith(vendorRoot)) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}
