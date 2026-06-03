import fs from 'node:fs';
import path from 'node:path';

/**
 * Load `.env.local` then `.env` into `process.env` when keys are not already set.
 * Mirrors Next.js file order for local development and scripts that import `@/lib/utils/env` directly.
 */
export function loadDotenvFiles(cwd: string = process.cwd()): void {
  for (const name of ['.env.local', '.env']) {
    const filePath = path.join(cwd, name);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}
