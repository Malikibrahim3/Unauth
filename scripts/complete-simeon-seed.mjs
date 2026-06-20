/**
 * Disabled legacy v1 completion seeder.
 *
 * The current merchant demo uses the deterministic v2 seed. This historical
 * helper is retained only to fail closed when invoked from old instructions.
 */

console.error('Legacy Simeon v1 completion seed is disabled. Use scripts/seed-demo-v2.mjs for the current merchant demo.');
process.exit(1);
