import { readdirSync } from 'node:fs';
import {
  ACTIVE_MIGRATIONS,
  ACTIVE_MIGRATION_VERSIONS,
  assertActiveMigrationLayout,
} from './release-migration-manifest.mjs';

const actualMigrations = readdirSync('supabase/migrations')
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();

assertActiveMigrationLayout(actualMigrations);

const actualVersions = actualMigrations.map((file) => file.slice(0, 14));
if (JSON.stringify(actualVersions) !== JSON.stringify(ACTIVE_MIGRATION_VERSIONS)) {
  throw new Error('Active migration filenames are not in timestamp order.');
}

console.log(
  `PASS reviewed migration layout (${ACTIVE_MIGRATIONS.length} SQL files; ${ACTIVE_MIGRATION_VERSIONS.length} unique timestamps).`,
);
