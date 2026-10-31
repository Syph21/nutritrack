import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const required = ['index.html', 'manifest.json', 'sw.js', 'icon.svg'];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) throw new Error('Missing ' + f);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const checks = ['<title>', 'manifest.json', 'serviceWorker', 'function showToast', 'nutri_daily_logs'];
for (const c of checks) {
  if (!html.includes(c)) throw new Error('index.html missing: ' + c);
}
console.log('OK: all checks passed');

