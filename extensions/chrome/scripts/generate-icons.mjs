/**
 * Copies the canonical R1 symbol derivatives into the extension package.
 * Run from the repository root with `npm run build:extension`; the root brand
 * generator owns the artwork and this package only owns the required sizes.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(scriptDir, '../icons');
const generatedDir = resolve(scriptDir, '../../../public/brand/unauth-r1/generated');

mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const source = resolve(generatedDir, `chrome-icon-${size}.png`);
  const destination = resolve(iconsDir, `icon${size}.png`);
  copyFileSync(source, destination);
  console.log(`Copied ${source} → ${destination}`);
}
