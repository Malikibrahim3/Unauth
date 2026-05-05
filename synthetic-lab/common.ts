const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");

const LAB_ROOT = __dirname;
const REPO_ROOT = path.resolve(LAB_ROOT, "..");
const DEFAULT_OUTPUT_DIR = path.join(LAB_ROOT, "outputs");

const FRAUD_STRATEGIES = [
  "serial_refund_abuse",
  "inr_fraud",
  "address_cluster",
  "plus_alias_abuse",
  "disposable_email_abuse",
  "payment_churn",
  "cross_merchant_overlap",
  "velocity_attack",
  "mixed_borderline",
];

const REQUIRED_COLUMNS = [
  "order_id",
  "order_date",
  "customer_email",
  "customer_name",
  "shipping_address",
  "order_total",
  "currency",
  "order_status",
];

const MERCHANT_COLUMNS = [
  ...REQUIRED_COLUMNS,
  "customer_phone",
  "billing_address",
  "refund_status",
  "refund_reason",
  "refund_date",
  "refund_amount",
  "payment_method",
  "ip_address",
  "device_id",
  "merchant_id",
  "merchant_name",
  "platform_customer_id",
  "billing_name",
  "shipping_name",
  "card_bin",
  "card_bin_country",
  "payment_fingerprint",
  "payment_attempts",
  "failed_payment_count",
  "coupon_code",
  "discount_amount",
  "referral_source",
  "affiliate_id",
  "session_id",
  "account_created_at",
  "account_age_days",
  "delivery_method",
  "courier",
  "tracking_status",
  "signature_required",
  "delivery_date",
  "claim_status",
  "claim_reason",
  "claim_date",
  "claim_amount",
  "sku_count",
  "skus",
  "category_mix",
  "basket_items",
  "user_agent",
  "browser_fingerprint",
  "ip_asn",
  "ip_isp",
  "ip_country",
  "ip_city",
  "geo_distance_km",
  "billing_shipping_distance_km",
  "vat_number",
  "business_account",
  "support_ticket_count",
  "previous_refund_count",
  "previous_claim_count",
  "checkout_seconds",
  "cart_edits",
  "abandoned_checkout_count",
  "marketing_consent",
];

const UK_TOWNS = [
  ["London", "E", "E1 6AN"],
  ["London", "SW", "SW11 3HE"],
  ["Manchester", "M", "M4 1HQ"],
  ["Birmingham", "B", "B1 1AA"],
  ["Leeds", "LS", "LS1 4DY"],
  ["Bristol", "BS", "BS1 5TR"],
  ["Glasgow", "G", "G1 2FF"],
  ["Cardiff", "CF", "CF10 1EP"],
  ["Liverpool", "L", "L1 8JQ"],
  ["Nottingham", "NG", "NG1 5FS"],
  ["Sheffield", "S", "S1 2HE"],
  ["Newcastle upon Tyne", "NE", "NE1 4LF"],
  ["Brighton", "BN", "BN1 1AL"],
  ["Oxford", "OX", "OX1 3PN"],
  ["Cambridge", "CB", "CB2 1TN"],
];

const FIRST_NAMES = [
  "Oliver", "George", "Harry", "Noah", "Muhammad", "Leo", "Arthur", "Oscar",
  "Amelia", "Olivia", "Isla", "Ava", "Mia", "Sophia", "Grace", "Freya",
  "James", "Thomas", "Daniel", "Jack", "Charlie", "Henry", "Emily", "Evie",
  "Sophie", "Lily", "Ruby", "Chloe", "Ella", "Layla", "Aisha", "Zara",
  "Yusuf", "Adam", "Hassan", "Ibrahim", "Fatima", "Maryam", "Sana", "Maya",
];

const LAST_NAMES = [
  "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies",
  "Patel", "Khan", "Singh", "Begum", "Ahmed", "Ali", "Hussain", "Thompson",
  "White", "Walker", "Green", "Hall", "Wood", "Clarke", "Jackson", "Wright",
  "Robinson", "Lewis", "Morris", "Young", "King", "Edwards",
];

const STREETS = [
  "High Street", "Station Road", "Church Road", "London Road", "Victoria Road",
  "Green Lane", "Manor Road", "Park Road", "Mill Lane", "The Avenue",
  "Kings Road", "Queens Road", "School Lane", "Market Street", "Albert Road",
  "New Road", "Grove Road", "Bridge Street", "Castle Street", "North Street",
];

const EMAIL_DOMAINS = [
  ["gmail.com", 34],
  ["outlook.com", 16],
  ["hotmail.co.uk", 12],
  ["yahoo.co.uk", 9],
  ["icloud.com", 8],
  ["btinternet.com", 5],
  ["sky.com", 4],
  ["live.co.uk", 3],
  ["proton.me", 2],
  ["customer-mail.co.uk", 1],
];

const DISPOSABLE_DOMAINS = ["maildrop.cc", "tempmail.dev", "guerrillamail.com", "10minutemail.com", "trashmail.com"];
const PAYMENT_METHODS = ["card", "paypal", "klarna", "apple_pay", "google_pay", "clearpay", "shop_pay"];
const COURIERS = ["Royal Mail", "Evri", "DPD", "DHL", "Yodel", "UPS", "FedEx", "Collect+"];
const CATEGORIES = ["electronics", "fashion", "beauty", "home", "sports", "toys", "books", "jewellery", "pet", "grocery"];
const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
];

const DEFAULT_SCORING_WEIGHTS = {
  disposable_email: 1,
  plus_alias: 1,
  young_account: 1,
  claim_rate: 1,
  refund_rate: 1,
  inr_timing: 1,
  high_value_claim: 1,
  full_refund: 1,
  payment_churn: 1,
  billing_shipping_mismatch: 1,
  geo_mismatch: 1,
  fast_checkout: 1,
  cart_edits: 1,
  ip_risk: 1,
  rushed_shipping: 1,
  email_reuse: 1,
  phone_reuse: 1,
  address_cluster: 1,
  shared_device: 1,
  shared_payment: 1,
  ip_velocity: 1,
  cluster_claim_corroboration: 1,
  business_address_guard: 1,
  student_address_guard: 1,
  cancelled_order_guard: 1,
  order_velocity: 1,
  first_order_claim: 1,
};

const SCORING_WEIGHT_LIMITS = {
  min: 0.25,
  max: 3,
};

const SCORING_WEIGHT_CAPS = {
  email_reuse: 1.35,
  phone_reuse: 1.2,
  address_cluster: 1.2,
  shared_device: 1.35,
  shared_payment: 1.35,
  ip_velocity: 1.15,
  cluster_claim_corroboration: 1.5,
  claim_rate: 2,
  refund_rate: 2.2,
  full_refund: 1.8,
  inr_timing: 2,
  high_value_claim: 1.6,
  payment_churn: 1.5,
  order_velocity: 1.8,
  first_order_claim: 2,
};

function hashSeed(seed) {
  const h = crypto.createHash("sha256").update(String(seed)).digest();
  return h.readUInt32LE(0) || 1;
}

class RNG {
  constructor(seed) {
    this.state = hashSeed(seed);
  }

  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  chance(p) {
    return this.next() < p;
  }

  pick(items) {
    return items[this.int(0, items.length - 1)];
  }

  weighted(weightedItems) {
    const total = weightedItems.reduce((sum, item) => sum + item[1], 0);
    let roll = this.next() * total;
    for (const item of weightedItems) {
      roll -= item[1];
      if (roll <= 0) return item[0];
    }
    return weightedItems[weightedItems.length - 1][0];
  }

  normal(mean, sd) {
    const u = Math.max(1e-9, this.next());
    const v = Math.max(1e-9, this.next());
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

function parseArgs(defaults = {}) {
  const out = { ...defaults };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    let key;
    let value;
    if (eq >= 0) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    }
    if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    if (value === "true") value = true;
    if (value === "false") value = false;
    out[key] = value;
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeScoringWeights(raw = {}) {
  const source = raw.weights && typeof raw.weights === "object" ? raw.weights : raw;
  const weights = { ...DEFAULT_SCORING_WEIGHTS };
  for (const key of Object.keys(weights)) {
    const value = Number(source[key]);
    const max = SCORING_WEIGHT_CAPS[key] || SCORING_WEIGHT_LIMITS.max;
    weights[key] = roundMetric(clamp(Number.isFinite(value) ? value : weights[key], SCORING_WEIGHT_LIMITS.min, max));
  }
  return weights;
}

function loadScoringWeights(file) {
  if (!file || !fs.existsSync(file)) return normalizeScoringWeights();
  return normalizeScoringWeights(readJson(file, {}));
}

function writeScoringWeights(file, weights, extra = {}) {
  writeJson(file, {
    generated_at: new Date().toISOString(),
    limits: SCORING_WEIGHT_LIMITS,
    weights: normalizeScoringWeights(weights),
    ...extra,
  });
}

function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(columns, row) {
  return columns.map((column) => csvEscape(row[column])).join(",") + "\n";
}

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function streamCsv(file, onRow) {
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  let headers = null;
  let index = 0;
  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < headers.length; i += 1) row[headers[i]] = values[i] || "";
    await onRow(row, index++);
  }
  return index;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeEmail(email) {
  const lower = String(email || "").trim().toLowerCase();
  const parts = lower.split("@");
  if (parts.length !== 2) return lower;
  let local = parts[0];
  let domain = parts[1].replace(/^googlemail\.com$/, "gmail.com");
  if (local.includes("+")) local = local.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  const typoMap = {
    "gamil.com": "gmail.com",
    "gmail.co": "gmail.com",
    "hotmial.co.uk": "hotmail.co.uk",
    "outlok.com": "outlook.com",
    "yaho.co.uk": "yahoo.co.uk",
  };
  domain = typoMap[domain] || domain;
  return `${local}@${domain}`;
}

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("44")) digits = "0" + digits.slice(2);
  if (digits.startsWith("0044")) digits = "0" + digits.slice(4);
  return digits;
}

function normalizeAddress(address) {
  let s = String(address || "").toLowerCase();
  s = s.replace(/[,.\n\r]/g, " ");
  s = s.replace(/\b(apartment|apt|unit)\b/g, "flat");
  s = s.replace(/\b(road)\b/g, "rd");
  s = s.replace(/\b(street)\b/g, "st");
  s = s.replace(/\b(avenue)\b/g, "ave");
  s = s.replace(/\b(lane)\b/g, "ln");
  s = s.replace(/\b(the)\b/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function nameTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function addDays(date, days) {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function money(n) {
  return Math.max(0, n).toFixed(2);
}

function stableId(prefix, value, len = 12) {
  return `${prefix}_${crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, len)}`;
}

function levenshtein(a, b) {
  a = String(a || "");
  b = String(b || "");
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function chooseEmailDomain(rng, disposable = false) {
  if (disposable) return rng.pick(DISPOSABLE_DOMAINS);
  return rng.weighted(EMAIL_DOMAINS);
}

function makeAddress(rng, type = "residential") {
  const town = rng.pick(UK_TOWNS);
  const number = rng.int(1, 220);
  const street = rng.pick(STREETS);
  let prefix = "";
  if (type === "student") prefix = `Room ${rng.int(1, 420)}, ${rng.pick(["Liberty Court", "Unite Students", "The Glassworks", "Kelvin Hall"])}, `;
  if (type === "flat") prefix = `Flat ${rng.int(1, 80)}, `;
  if (type === "business") prefix = `${rng.pick(["Unit", "Suite", "Floor"])} ${rng.int(1, 28)}, ${rng.pick(["Enterprise House", "Meridian Works", "Exchange Point"])}, `;
  const outward = town[1];
  const postcode = `${outward}${rng.int(1, 20)} ${rng.int(1, 9)}${String.fromCharCode(65 + rng.int(0, 25))}${String.fromCharCode(65 + rng.int(0, 25))}`;
  return `${prefix}${number} ${street}, ${town[0]}, ${postcode || town[2]}`;
}

function mutateAddress(address, rng, intensity = 0.4) {
  let s = address;
  if (rng.chance(intensity)) s = s.replace(/\bStreet\b/g, "St").replace(/\bRoad\b/g, "Rd").replace(/\bAvenue\b/g, "Ave").replace(/\bLane\b/g, "Ln");
  if (rng.chance(intensity)) s = s.replace(/,\s*/g, rng.pick([", ", " ", " / "]));
  if (rng.chance(intensity)) s = s.replace(/\bFlat\s+(\d+)/i, rng.pick(["Apt $1", "Apartment $1", "Unit $1", "Flat $1"]));
  if (rng.chance(intensity)) s = s.replace(/([A-Z]{1,2}\d{1,2})\s*(\d[A-Z]{2})$/i, "$1$2");
  if (rng.chance(intensity * 0.5)) s = s.replace(/\s+/g, " ");
  return s.trim();
}

function mutateName(first, last, rng, intensity = 0.3) {
  const nicknames = { Thomas: "Tom", Daniel: "Dan", Mohammad: "Mo", Muhammad: "Mo", Oliver: "Ollie", William: "Will", Katherine: "Kate", Elizabeth: "Liz", Sophie: "Soph" };
  let f = first;
  let l = last;
  if (rng.chance(intensity) && nicknames[f]) f = nicknames[f];
  if (rng.chance(intensity)) f = `${f[0]}.`;
  if (rng.chance(intensity * 0.5) && f.length > 3) f = f.slice(0, -1);
  if (rng.chance(intensity * 0.25)) return `${l} ${f}`;
  return `${f} ${l}`;
}

function mutateEmail(baseEmail, first, last, rng, strategy = "normal", intensity = 0.4) {
  const [baseLocal, baseDomain] = baseEmail.split("@");
  let local = baseLocal;
  let domain = baseDomain;
  if (strategy === "disposable_email_abuse") domain = chooseEmailDomain(rng, true);
  if (strategy === "domain_switching" || rng.chance(intensity * 0.15)) domain = chooseEmailDomain(rng, false);
  if (strategy === "plus_alias_abuse" || rng.chance(intensity * 0.35)) local = `${local}+${rng.pick(["returns", "home", "shop", "pc", "x"])}${rng.int(1, 999)}`;
  if (rng.chance(intensity * 0.2) && domain === "gmail.com") {
    const pos = rng.int(1, Math.max(1, local.length - 1));
    local = `${local.slice(0, pos)}.${local.slice(pos)}`;
  }
  if (rng.chance(intensity * 0.2)) local = `${slug(last)}.${slug(first)}${rng.int(1, 99)}`;
  if (rng.chance(intensity * 0.1)) domain = domain.replace("gmail.com", "gamil.com").replace("outlook.com", "outlok.com");
  return `${local}@${domain}`;
}

function makePhone(rng) {
  const base = `07${rng.int(100000000, 999999999)}`;
  if (rng.chance(0.25)) return `+44 ${base.slice(1, 5)} ${base.slice(5, 8)} ${base.slice(8)}`;
  if (rng.chance(0.25)) return `${base.slice(0, 5)} ${base.slice(5, 8)} ${base.slice(8)}`;
  if (rng.chance(0.08)) return `${base.slice(0, 4)}-${base.slice(4, 7)}-${base.slice(7)}`;
  return base;
}

function makeIp(rng, type = "residential") {
  if (type === "missing") return "";
  if (type === "mobile") return `${rng.pick([31, 82, 92, 109])}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
  if (type === "vpn") return `${rng.pick([45, 89, 141, 185])}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
  return `${rng.pick([51, 81, 86, 90, 94, 151])}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
}

function basketFor(rng, strategy = "normal") {
  const category = strategy === "inr_fraud" || strategy === "payment_churn" ? rng.pick(["electronics", "jewellery", "fashion"]) : rng.pick(CATEGORIES);
  const skuCount = strategy === "serial_refund_abuse" ? rng.int(2, 7) : Math.max(1, Math.round(rng.normal(2.2, 1.2)));
  const skus = [];
  for (let i = 0; i < skuCount; i += 1) skus.push(`${category.slice(0, 3).toUpperCase()}-${rng.int(1000, 9999)}`);
  return { skuCount, skus: skus.join("|"), categoryMix: category, basketItems: skus.map((sku) => `${sku} x1`).join("; ") };
}

function valueFor(rng, segment = "standard", strategy = "normal") {
  let mean = 58;
  let sd = 34;
  if (segment === "low_ticket") { mean = 22; sd = 12; }
  if (segment === "high_ltv") { mean = 88; sd = 55; }
  if (strategy === "inr_fraud" || strategy === "payment_churn") { mean = 145; sd = 85; }
  if (strategy === "velocity_attack") { mean = 95; sd = 70; }
  if (rng.chance(0.025)) return money(rng.normal(360, 160));
  return money(Math.max(4.99, rng.normal(mean, sd)));
}

function roundMetric(n) {
  return Number.isFinite(n) ? Number(n.toFixed(4)) : 0;
}

function precisionRecallF1(tp, fp, fn) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision: roundMetric(precision), recall: roundMetric(recall), f1: roundMetric(f1) };
}

function formatPct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

module.exports = {
  LAB_ROOT,
  REPO_ROOT,
  DEFAULT_OUTPUT_DIR,
  FRAUD_STRATEGIES,
  REQUIRED_COLUMNS,
  MERCHANT_COLUMNS,
  DEFAULT_SCORING_WEIGHTS,
  SCORING_WEIGHT_LIMITS,
  SCORING_WEIGHT_CAPS,
  UK_TOWNS,
  FIRST_NAMES,
  LAST_NAMES,
  STREETS,
  PAYMENT_METHODS,
  COURIERS,
  CATEGORIES,
  USER_AGENTS,
  DISPOSABLE_DOMAINS,
  RNG,
  parseArgs,
  ensureDir,
  writeJson,
  readJson,
  normalizeScoringWeights,
  loadScoringWeights,
  writeScoringWeights,
  csvEscape,
  csvRow,
  parseCsvLine,
  streamCsv,
  slug,
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  nameTokens,
  daysBetween,
  addDays,
  isoDate,
  money,
  stableId,
  levenshtein,
  chooseEmailDomain,
  makeAddress,
  mutateAddress,
  mutateName,
  mutateEmail,
  makePhone,
  makeIp,
  basketFor,
  valueFor,
  precisionRecallF1,
  formatPct,
  roundMetric,
};
