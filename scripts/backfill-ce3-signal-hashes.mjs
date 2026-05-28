#!/usr/bin/env node
/**
 * Backfill audit_transactions.ce3_signal_hashes from plaintext columns.
 * Run AFTER applying migration 20260528220000_audit_tx_ce3_signal_hashes.sql
 *
 *   node scripts/backfill-ce3-signal-hashes.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, IDENTITY_SALT in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = 200;

const DOT_IGNORING_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'fastmail.com', 'fastmail.fm',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com',
]);

const ADDRESS_ABBREVIATIONS = {
  st: 'street',
  rd: 'road',
  ave: 'avenue',
  av: 'avenue',
  ln: 'lane',
  cl: 'close',
  dr: 'drive',
  blvd: 'boulevard',
  bvd: 'boulevard',
  ct: 'court',
  pl: 'place',
  sq: 'square',
  apt: 'apartment',
};

function loadEnv() {
  const dotenvPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(dotenvPath)) return;
  const text = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

function hashIdentifier(value, salt) {
  return createHmac('sha256', salt).update(value).digest('hex');
}

function normaliseEmail(raw) {
  if (!raw) return null;
  const lower = String(raw).trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const plusStripped = lower.slice(0, at).split('+')[0];
  const domain = lower.slice(at + 1);
  const localPart = DOT_IGNORING_DOMAINS.has(domain)
    ? plusStripped.replace(/\./g, '')
    : plusStripped;
  if (!localPart) return null;
  return `${localPart}@${domain}`;
}

function normaliseAddressTokens(raw) {
  if (!raw) return [];
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(' ').map((t) => ADDRESS_ABBREVIATIONS[t] ?? t);
  return tokens.sort();
}

function normaliseAddress(raw) {
  const tokens = normaliseAddressTokens(raw);
  return tokens.length > 0 ? tokens.join(' ') : null;
}

function isNonEmptyHashes(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.keys(obj).length > 0;
}

function buildCe3FromPlaintext(row, salt) {
  const out = {};
  const email = normaliseEmail(row.customer_email);
  if (email) out.emailVariant = hashIdentifier(email, salt);

  const ip = row.device_ip ? String(row.device_ip).trim().toLowerCase() : null;
  if (ip) out.ipCluster = hashIdentifier(ip, salt);

  const addr = row.shipping_address ? normaliseAddress(row.shipping_address) : null;
  if (addr) out.addressCluster = hashIdentifier(addr, salt);

  return out;
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.IDENTITY_SALT;
  if (!url || !key || !salt) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or IDENTITY_SALT in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let lastId = '';
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  while (true) {
    let query = supabase
      .from('audit_transactions')
      .select('id, customer_email, device_ip, shipping_address, ce3_signal_hashes')
      .order('id', { ascending: true })
      .limit(PAGE);

    if (lastId) query = query.gt('id', lastId);

    const { data, error } = await query;
    if (error) {
      console.error('Fetch error:', error.message);
      process.exit(1);
    }
    if (!data?.length) break;

    for (const row of data) {
      if (isNonEmptyHashes(row.ce3_signal_hashes)) {
        skipped += 1;
        continue;
      }

      const hashes = buildCe3FromPlaintext(row, salt);
      if (Object.keys(hashes).length === 0) {
        skipped += 1;
        continue;
      }

      const { error: upErr } = await supabase
        .from('audit_transactions')
        .update({ ce3_signal_hashes: hashes })
        .eq('id', row.id);

      if (upErr) {
        console.error(`Failed ${row.id}:`, upErr.message);
        errors += 1;
      } else {
        updated += 1;
      }
    }

    lastId = data[data.length - 1].id;
    console.log(`Progress: updated=${updated} skipped=${skipped} errors=${errors} lastId=${lastId}`);
    if (data.length < PAGE) break;
  }

  console.log(`Done. Updated=${updated} skipped=${skipped} errors=${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
