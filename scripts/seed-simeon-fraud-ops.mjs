/**
 * Disabled legacy v1 fraud-ops seeder.
 *
 * This entry point targeted the old merchant demo schema. Keep the file as a
 * clear stop sign for anyone with old docs or shell history, but do not write
 * legacy rows from it.
 */

console.error('Legacy Simeon v1 fraud-ops seed is disabled. Use scripts/seed-demo-v2.mjs for the current merchant demo.');
process.exit(1);
