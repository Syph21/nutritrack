import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'sb.js'];

if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log('copied', f);
  }
}
console.log('Web build ready in', out);

