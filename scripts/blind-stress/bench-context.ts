#!/usr/bin/env ts-node
// Times the in-memory portion of buildFastContext + linker on 40 / 2000 / 5000 / 10000
// row subsets of scenario-8 (synthetic 10k dataset). Read-only — no DB writes.
//
// Note: buildFastContext() in production also fires Supabase queries for
// historical enrichment (customer_profiles, fraud_entities). Those queries are
// NOT included in this measurement — this is the pure CPU/in-memory benchmark.
// See report for explicit caveat.

process.env.IDENTITY_SALT = process.env.IDENTITY_SALT || 'bench-salt-0000000000000000000000000000000000000000000000000000000000000000';

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { cleanRow } from '../../lib/csv/clean';
import { csvRowSchema } from '../../lib/csv/schema';
import { normaliseRow } from '../../lib/csv/normalise';
import { scoreOrders } from '../../lib/engine';
import { linkIdentities, type LinkerOrderInput } from '../../lib/linker';

const csvPath = path.join(__dirname, 'data', 'scenario-8.csv');
const raw = fs.readFileSync(csvPath, 'utf-8');
const parsed = Papa.parse<Record<string, string>>(raw, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase(),
});

const orders = parsed.data.map((r) => {
  const cleaned = cleanRow(r);
  const v = csvRowSchema.safeParse(cleaned);
  if (!v.success) return null;
  return normaliseRow(v.data);
}).filter((x): x is NonNullable<typeof x> => x !== null);

function buildLinkerInputs(rs: typeof orders): LinkerOrderInput[] {
  return rs.map((o) => ({
    order_id: o.orderId,
    email: o._rawEmail ?? null,
    phone: o._rawPhone ?? null,
    address: o._rawAddress ?? null,
    shipping_address: o._rawAddress ?? null,
    postcode: o._rawPostcode ?? null,
    ip: o._rawIP ?? null,
    card_last4: o._rawCardLast4 ?? null,
    card_bin: o._rawCardBin ?? null,
    card_fingerprint: o._rawCardFingerprint ?? null,
    device_fingerprint: o._rawDeviceId ?? null,
    account_id: o._rawAccountId ?? null,
    name: o.customerNameNorm ?? null,
  }));
}

function bench(label: string, n: number) {
  const slice = orders.slice(0, n);
  // Total timing
  const tStart = Date.now();
  const linkerInputs = buildLinkerInputs(slice);
  const tLink0 = Date.now();
  linkIdentities(linkerInputs);
  const tLink = Date.now() - tLink0;
  const tScore0 = Date.now();
  scoreOrders(slice);
  const tScore = Date.now() - tScore0;
  const tTotal = Date.now() - tStart;
  console.log(`${label.padEnd(20)} rows=${slice.length}  total=${tTotal}ms  linker=${tLink}ms  scoreOrders=${tScore}ms`);
}

console.log(`Loaded ${orders.length} normalised orders from scenario-8.csv`);
bench('40-row', 40);
bench('500-row', 500);
bench('2000-row', 2000);
bench('5000-row', 5000);
bench('10000-row', 10000);
