import fs from 'node:fs';
import { AUTH_DIR } from './global-setup';

export default async function globalTeardown() {
  if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}
