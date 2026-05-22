import fs from 'node:fs';
import path from 'node:path';

type Row = Record<string, string>;

const OUT_DIR = path.resolve(process.cwd(), 'test-data/multi-merchant');
const ROWS_PER_MERCHANT = 10_000;
const merchants = ['aurora-outfitters', 'northline-electronics', 'harbor-home', 'vertex-sneakers', 'lumen-beauty'];
const headers = [
  'order_id',
  'email',
  'customer_name',
  'phone',
  'shipping_address',
  'ip_address',
  'device_fingerprint',
  'card_last4',
  'order_total',
  'order_date',
  'refund_requested',
  'chargeback_filed',
  '_ground_truth',
  '_expected_cross_merchant_grade',
];

class Rng {
  constructor(private seed: number) {}
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(items: T[]) {
    return items[this.int(0, items.length - 1)];
  }
  chance(p: number) {
    return this.next() < p;
  }
}

const first = ['Amelia', 'Noah', 'Maya', 'Leo', 'Zara', 'Theo', 'Grace', 'James', 'Olivia', 'Harris'];
const last = ['Patel', 'Smith', 'Khan', 'Jones', 'Taylor', 'Morgan', 'Singh', 'Evans', 'Roberts', 'Lewis'];
const streets = ['King Street', 'Station Road', 'Market Road', 'Church Lane', 'Park Avenue', 'High Street'];
const cities = ['London', 'Manchester', 'Bristol', 'Leeds', 'Birmingham', 'Cardiff'];

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function writeCsv(file: string, rows: Row[]) {
  const body = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h] ?? '')).join(','))].join('\n');
  fs.writeFileSync(file, `${body}\n`);
}

function date(idx: number, merchantIndex: number) {
  const d = new Date('2026-01-01T10:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + ((idx + merchantIndex * 17) % 140));
  return d.toISOString();
}

function baseRow(rng: Rng, merchant: string, merchantIndex: number, idx: number): Row {
  const fn = rng.pick(first);
  const ln = rng.pick(last);
  const city = rng.pick(cities);
  const postcode = `${rng.pick(['SW', 'NW', 'EC', 'M', 'BS', 'LS'])}${rng.int(1, 19)} ${rng.int(1, 9)}${String.fromCharCode(65 + (idx % 26))}${String.fromCharCode(65 + ((idx + 9) % 26))}`;
  const address = `${rng.int(1, 240)} ${rng.pick(streets)}, ${city}, ${postcode}, GB`;
  const orderTotal = (rng.int(1800, 26000) / 100).toFixed(2);
  return {
    order_id: `${merchant.slice(0, 3).toUpperCase()}-${String(idx).padStart(6, '0')}`,
    email: `${fn}.${ln}.${merchantIndex}.${idx}@example-customer.test`.toLowerCase(),
    customer_name: `${fn} ${ln}`,
    phone: `+447${String(100000000 + idx + merchantIndex * 10000).slice(0, 9)}`,
    shipping_address: address,
    ip_address: `86.${rng.int(1, 220)}.${rng.int(1, 220)}.${rng.int(1, 220)}`,
    device_fingerprint: `dev_${merchantIndex}_${String(idx).padStart(7, '0')}`,
    card_last4: String(rng.int(0, 9999)).padStart(4, '0'),
    order_total: orderTotal,
    order_date: date(idx, merchantIndex),
    refund_requested: rng.chance(0.035) ? 'true' : 'false',
    chargeback_filed: rng.chance(0.006) ? 'true' : 'false',
    _ground_truth: 'legit',
    _expected_cross_merchant_grade: '',
  };
}

function apply(row: Row, patch: Partial<Row>) {
  Object.assign(row, patch);
  row._ground_truth = patch._ground_truth ?? row._ground_truth;
  row._expected_cross_merchant_grade = patch._expected_cross_merchant_grade ?? row._expected_cross_merchant_grade;
}

function seedScenario(rowsByMerchant: Row[][]) {
  const sharedAddress = '14 Lockbox Lane, Birmingham, B4 8QA, GB';
  const sharedIp = '185.44.12.91';
  for (const merchantIndex of [0, 1, 3]) {
    for (let n = 0; n < 18; n++) {
      apply(rowsByMerchant[merchantIndex][120 + n], {
        email: `returns${n % 4}+${merchantIndex}@fastmail.test`,
        customer_name: ['Nia Cross', 'Mila Stone', 'Ari Vale'][n % 3],
        phone: `+44770090${String(n).padStart(3, '0')}`,
        shipping_address: sharedAddress,
        ip_address: sharedIp,
        device_fingerprint: `fraud-ring-alpha-${n % 5}`,
        card_last4: ['4444', '8181', '2020'][n % 3],
        refund_requested: 'true',
        chargeback_filed: n % 5 === 0 ? 'true' : 'false',
        _ground_truth: 'fraud_ring_shared_ip_address_m1_m2_m4',
        _expected_cross_merchant_grade: 'definite',
      });
    }
  }

  apply(rowsByMerchant[0][800], {
    email: 'casey.bridge@example.test',
    customer_name: 'Casey Bridge',
    _ground_truth: 'same_email_different_names_m1_m3',
    _expected_cross_merchant_grade: 'probable',
  });
  apply(rowsByMerchant[2][1180], {
    email: 'casey.bridge@example.test',
    customer_name: 'Jordan Hale',
    refund_requested: 'true',
    _ground_truth: 'same_email_different_names_m1_m3',
    _expected_cross_merchant_grade: 'probable',
  });

  for (const [merchantIndex, rowIndex] of [[1, 500], [4, 900]] as const) {
    apply(rowsByMerchant[merchantIndex][rowIndex], {
      email: `device.link.${merchantIndex}@example.test`,
      device_fingerprint: 'device-fp-reused-9921',
      card_last4: merchantIndex === 1 ? '1199' : '7711',
      _ground_truth: 'same_device_m2_m5',
      _expected_cross_merchant_grade: 'possible',
    });
  }

  for (const merchantIndex of [0, 2, 4]) {
    for (let n = 0; n < 25; n++) {
      apply(rowsByMerchant[merchantIndex][2500 + n], {
        email: `loyal.customer.${n}@mail.test`,
        customer_name: `Clean Shopper ${n}`,
        phone: `+44791111${String(n).padStart(3, '0')}`,
        _ground_truth: 'legit_cross_merchant_overlap',
        _expected_cross_merchant_grade: '',
      });
    }
  }

  apply(rowsByMerchant[3][3333], {
    email: 'quiet.clean@example.test',
    customer_name: 'Riley Park',
    _ground_truth: 'clean_here_flagged_elsewhere',
    _expected_cross_merchant_grade: '',
  });
  apply(rowsByMerchant[4][3333], {
    email: 'quiet.clean@example.test',
    customer_name: 'Riley Park',
    refund_requested: 'true',
    chargeback_filed: 'true',
    ip_address: sharedIp,
    shipping_address: sharedAddress,
    _ground_truth: 'clean_here_flagged_elsewhere',
    _expected_cross_merchant_grade: 'probable',
  });
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rng = new Rng(424242);
  const rowsByMerchant = merchants.map((merchant, merchantIndex) =>
    Array.from({ length: ROWS_PER_MERCHANT }, (_, idx) => baseRow(rng, merchant, merchantIndex, idx + 1))
  );
  seedScenario(rowsByMerchant);
  merchants.forEach((merchant, index) => {
    writeCsv(path.join(OUT_DIR, `${index + 1}-${merchant}.csv`), rowsByMerchant[index]);
  });
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), rowsPerMerchant: ROWS_PER_MERCHANT, merchants }, null, 2)
  );
  console.log(`Generated ${merchants.length} CSVs in ${OUT_DIR}`);
}

main();
