/**
 * Disabled legacy v1 demo seeder.
 *
 * The current merchant demo is seeded by scripts/seed-demo-v2.mjs, which writes
 * the v2 tables read by the product. This historical v1 entry point used tables
 * that are no longer part of the merchant demo read model.
 */

console.error('Legacy v1 demo seed is disabled. Use npm run seed:demo for the deterministic v2 sample merchant.');
process.exit(1);
