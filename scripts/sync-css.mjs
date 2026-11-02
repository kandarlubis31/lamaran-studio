// sync-css.mjs — generate src/assets/inline-css.js dari src/styles/*.css
// Jalankan: npm run sync:css   (setelah mengubah cv.css / ml.css)
// Hasilnya dipakai renderer (browser & Node) tanpa Vite ?raw — supaya
// render.js bisa diimpor langsung oleh Node untuk test parity.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => s
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const cv = readFileSync(join(root, 'src/styles/cv.css'), 'utf8');
const ml = readFileSync(join(root, 'src/styles/ml.css'), 'utf8');

const out = `// AUTO-GENERATED oleh scripts/sync-css.mjs — JANGAN edit file ini.
// Sumber kebenaran: src/styles/cv.css & src/styles/ml.css
// Regenerasi: npm run sync:css
export const CV_CSS = \`${esc(cv)}\`;
export const ML_CSS = \`${esc(ml)}\`;
`;

mkdirSync(join(root, 'src/assets'), { recursive: true });
writeFileSync(join(root, 'src/assets/inline-css.js'), out, 'utf8');
console.log('OK: src/assets/inline-css.js dibuat (' + out.length + ' bytes)');
