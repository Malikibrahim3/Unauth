#!/usr/bin/env node
/**
 * Backfill customer_profiles.*_hashes from plaintext identifier arrays.
 * Run AFTER applying migration 20260528200000_customer_profile_identity_hashes.sql
 *
 *   node scripts/backfill-profile-hashes.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, IDENTITY_SALT in env.
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = 200;

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

function normalisePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function buildHashes(row, salt) {
  const emails = Array.isArray(row.emails) ? row.emails : [];
  const phones = Array.isArray(row.phones) ? row.phones : [];
  const addresses = Array.isArray(row.addresses) ? row.addresses : [];
  const cards = Array.isArray(row.card_last4s) ? row.card_last4s : [];
  const ips = Array.isArray(row.ips) ? row.ips : [];

  return {
    email_hashes: [...new Set(emails.map((e) => hashIdentifier(e, salt)))],
    phone_hashes: [
      ...new Set(
        phones
          .map((p) => normalisePhone(p))
          .filter(Boolean)
          .map((p) => hashIdentifier(p, salt))
      ),
    ],
    address_hashes: [...new Set(addresses.map((a) => hashIdentifier(a, salt)))],
    card_hashes: [...new Set(cards.map((c) => hashIdentifier(c, salt)))],
    ip_hashes: [...new Set(ips.map((ip) => hashIdentifier(ip, salt)))],
  };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.IDENTITY_SALT;
  if (!url || !key || !salt) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or IDENTITY_SALT');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let offset = 0;
  let updated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('id, emails, phones, addresses, card_last4s, ips')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data?.length) break;

    for (const row of data) {
      const hashes = buildHashes(row, salt);
      const { error: upErr } = await supabase.from('customer_profiles').update(hashes).eq('id', row.id);
      if (upErr) {
        console.error(`Failed ${row.id}:`, upErr.message);
        process.exit(1);
      }
      updated += 1;
    }

    offset += data.length;
    console.log(`Backfilled ${updated} profiles…`);
    if (data.length < PAGE) break;
  }

  console.log(`Done. Updated ${updated} customer_profiles rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
