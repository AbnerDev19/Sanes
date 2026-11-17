import { cp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
// Only replace generated output; source lives in app/, src/ and public/.
await rm(`${root}assets`, { recursive: true, force: true });
await cp(`${root}dist/assets`, `${root}assets`, { recursive: true });
await cp(`${root}dist/index.html`, `${root}index.html`);
await writeFile(`${root}.nojekyll`, '');
console.log('GitHub Pages files prepared: index.html, assets/, .nojekyll');
