const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_OUTPUT_DIR,
  FRAUD_STRATEGIES,
  MERCHANT_COLUMNS,
  FIRST_NAMES,
  LAST_NAMES,
  PAYMENT_METHODS,
  COURIERS,
  USER_AGENTS,
  DISPOSABLE_DOMAINS,
  RNG,
  parseArgs,
  ensureDir,
  writeJson,
  csvRow,
  slug,
  addDays,
  isoDate,
  daysBetween,
  stableId,
  chooseEmailDomain,
  makeAddress,
  mutateAddress,
  mutateName,
  mutateEmail,
  makePhone,
  makeIp,
  basketFor,
  valueFor,
  money,
} = require("./common.ts");

const defaultConfig = {
  orders: 100000,
  customers: 20000,
  "fraud-rate": 0.04,
  seed: 42,
  tier: "all",
  hardness: 0,
  "output-dir": DEFAULT_OUTPUT_DIR,
  prefix: "merchant_dataset",
  focus: "",
};

function tierSettings(tier) {
  const settings = {
    1: {
      name: "low_maturity",
      merchantName: "ParcelClaim Low Maturity Merchant",
      missingOptional: 0.48,
      enrich: 0.24,
      typoRate: 0.13,
      deviceCoverage: 0.22,
      ipCoverage: 0.58,
      paymentFingerprintCoverage: 0.18,
      browserCoverage: 0.16,
      platformCustomerCoverage: 0.35,
    },
    2: {
      name: "medium_maturity",
      merchantName: "ParcelClaim Medium Maturity Merchant",
      missingOptional: 0.22,
      enrich: 0.58,
      typoRate: 0.07,
      deviceCoverage: 0.55,
      ipCoverage: 0.82,
      paymentFingerprintCoverage: 0.48,
      browserCoverage: 0.45,
      platformCustomerCoverage: 0.72,
    },
    3: {
      name: "high_maturity",
      merchantName: "ParcelClaim High Maturity Merchant",
      missingOptional: 0.08,
      enrich: 0.86,
      typoRate: 0.03,
      deviceCoverage: 0.86,
      ipCoverage: 0.95,
      paymentFingerprintCoverage: 0.82,
      browserCoverage: 0.78,
      platformCustomerCoverage: 0.92,
    },
  };
  return settings[tier] || settings[2];
}

function makeBaseCustomer(rng, idx, tier, shared = {}) {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const domain = chooseEmailDomain(rng, false);
  const local = rng.chance(0.55)
    ? `${slug(first)}.${slug(last)}${rng.chance(0.35) ? rng.int(1, 999) : ""}`
    : `${slug(first[0])}${slug(last)}${rng.int(1, 99)}`;
  const addressType = rng.weighted([["residential", 70], ["flat", 16], ["student", 7], ["business", 7]]);
  const address = shared.address || makeAddress(rng, addressType);
  const phone = shared.phone || makePhone(rng);
  const email = `${local}@${domain}`;
  const segment = rng.weighted([
    ["one_time", 44],
    ["repeat", 34],
    ["occasional_refunder", 8],
    ["high_ltv", 8],
    ["low_ticket", 6],
  ]);
  return {
    canonicalId: stableId("cust", `${idx}-${email}-${address}`),
    platformCustomerId: stableId("pcus", `${tier}-${idx}`, 10),
    first,
    last,
    baseName: `${first} ${last}`,
    baseEmail: email,
    baseAddress: address,
    baseBillingAddress: rng.chance(0.12) ? makeAddress(rng, rng.pick(["residential", "flat", "business"])) : address,
    phone,
    segment,
    accountCreatedAt: null,
    deviceId: shared.deviceId || `dev_${stableId("", `${email}-${rng.int(1, 999999)}`, 16).slice(1)}`,
    paymentFingerprint: shared.paymentFingerprint || `pay_${stableId("", `${email}-${rng.int(1, 999999)}`, 14).slice(1)}`,
    cardBin: String(rng.pick([400000, 424242, 510510, 520000, 535522, 601100, 675964])),
    cardBinCountry: rng.chance(0.94) ? "GB" : rng.pick(["IE", "FR", "DE", "NL", "US"]),
    ipPool: shared.ipPool || [makeIp(rng, rng.chance(0.18) ? "mobile" : "residential")],
    sharedContext: shared.reason || "",
    fraudStrategy: null,
    fraudDifficulty: "clean",
    mutationStrategy: rng.weighted([
      ["stable_identity", 54],
      ["email_variations", 12],
      ["address_formatting", 10],
      ["phone_formatting", 8],
      ["domain_switching", 4],
      ["name_variations", 5],
      ["device_stable_email_rotates", 4],
      ["payment_stable_identity_rotates", 3],
    ]),
  };
}

function orderCountFor(profile, rng) {
  if (profile.segment === "one_time") return rng.chance(0.82) ? 1 : rng.int(2, 3);
  if (profile.segment === "repeat") return rng.int(2, 7);
  if (profile.segment === "occasional_refunder") return rng.int(3, 10);
  if (profile.segment === "high_ltv") return rng.int(10, 42);
  if (profile.segment === "low_ticket") return rng.int(2, 12);
  return rng.int(1, 5);
}

function buildProfiles(rng, customerCount, tier, hardness, focusStrategies) {
  const profiles = [];

  const edgeGroups = Math.max(18, Math.floor(customerCount * 0.018));
  for (let g = 0; g < edgeGroups; g += 1) {
    const groupType = rng.weighted([["family", 38], ["student", 24], ["business", 22], ["shared_device", 16]]);
    const shared = {
      address: makeAddress(rng, groupType === "student" ? "student" : groupType === "business" ? "business" : "residential"),
      reason: groupType,
    };
    if (groupType === "shared_device") shared.deviceId = `dev_shared_legit_${g}`;
    if (groupType === "family" && rng.chance(0.3)) shared.phone = makePhone(rng);
    const groupSize = rng.int(2, groupType === "student" ? 18 : groupType === "business" ? 12 : 5);
    for (let i = 0; i < groupSize && profiles.length < customerCount; i += 1) {
      profiles.push(makeBaseCustomer(rng, profiles.length, tier, shared));
    }
  }

  while (profiles.length < customerCount) profiles.push(makeBaseCustomer(rng, profiles.length, tier));

  const fraudCustomerTarget = Math.max(8, Math.floor(customerCount * (0.018 + hardness * 0.004)));
  const selected = new Set();
  const strategyWeights = FRAUD_STRATEGIES.map((strategy) => [strategy, focusStrategies.includes(strategy) ? 16 : 10]);
  while (selected.size < fraudCustomerTarget) {
    const idx = rng.int(0, profiles.length - 1);
    if (selected.has(idx)) continue;
    selected.add(idx);
    const profile = profiles[idx];
    profile.fraudDifficulty = rng.weighted([["obvious", 15 - Math.min(10, hardness)], ["medium", 42], ["subtle", 43 + Math.min(14, hardness)]]);
  }
  Array.from(selected).forEach((idx, order) => {
    const profile = profiles[idx];
    profile.fraudStrategy = order < FRAUD_STRATEGIES.length ? FRAUD_STRATEGIES[order] : rng.weighted(strategyWeights);
    profile.mutationStrategy = strategyMutation(profile.fraudStrategy);
    if (profile.fraudStrategy === "disposable_email_abuse") {
      profile.baseEmail = `${slug(profile.first)}.${slug(profile.last)}${rng.int(1, 9999)}@${rng.pick(DISPOSABLE_DOMAINS)}`;
    }
  });

  const clusterCount = Math.max(4, Math.floor(customerCount * 0.002));
  for (let c = 0; c < clusterCount; c += 1) {
    const sharedAddress = makeAddress(rng, rng.chance(0.5) ? "flat" : "residential");
    const sharedDevice = `dev_ring_${tier}_${c}_${rng.int(100, 999)}`;
    const sharedPayment = `pay_ring_${tier}_${c}_${rng.int(100, 999)}`;
    const size = rng.int(3, 9 + Math.floor(hardness / 2));
    for (let i = 0; i < size; i += 1) {
      const idx = rng.int(0, profiles.length - 1);
      const profile = profiles[idx];
      profile.fraudStrategy = i % 2 === 0 ? "address_cluster" : rng.pick(["plus_alias_abuse", "payment_churn", "cross_merchant_overlap"]);
      profile.fraudDifficulty = rng.weighted([["medium", 50], ["subtle", 50]]);
      profile.baseAddress = mutateAddress(sharedAddress, rng, 0.5);
      if (rng.chance(0.65)) profile.deviceId = sharedDevice;
      if (rng.chance(0.55)) profile.paymentFingerprint = sharedPayment;
      selected.add(idx);
    }
  }

  return profiles;
}

function strategyMutation(strategy) {
  const map = {
    serial_refund_abuse: "behaviour_shift_after_legit_history",
    inr_fraud: "claim_timing_and_delivery_gaps",
    address_cluster: "address_variations_shared_endpoint",
    plus_alias_abuse: "email_plus_dot_aliasing",
    disposable_email_abuse: "burner_domain_rotation",
    payment_churn: "payment_stable_or_churning_identity",
    cross_merchant_overlap: "merchant_switching_same_identity",
    velocity_attack: "short_window_order_velocity",
    mixed_borderline: "low_signal_multi_field_drift",
  };
  return map[strategy] || "stable_identity";
}

function applyMaturity(row, rng, settings) {
  const sparseFields = [
    "customer_phone",
    "billing_address",
    "refund_status",
    "refund_reason",
    "refund_date",
    "refund_amount",
    "payment_method",
    "ip_address",
    "device_id",
    "payment_fingerprint",
    "browser_fingerprint",
    "user_agent",
    "ip_asn",
    "ip_isp",
    "coupon_code",
    "affiliate_id",
    "session_id",
    "vat_number",
  ];
  for (const field of sparseFields) {
    if (row[field] && rng.chance(settings.missingOptional)) row[field] = "";
  }
  if (rng.chance(1 - settings.deviceCoverage)) row.device_id = "";
  if (rng.chance(1 - settings.ipCoverage)) row.ip_address = "";
  if (rng.chance(1 - settings.paymentFingerprintCoverage)) row.payment_fingerprint = "";
  if (rng.chance(1 - settings.browserCoverage)) {
    row.browser_fingerprint = "";
    row.user_agent = "";
  }
  if (rng.chance(1 - settings.platformCustomerCoverage)) row.platform_customer_id = "";
  return row;
}

function makeOrder(profile, orderIndex, totalForCustomer, ctx) {
  const { rng, tier, settings, startDate, daySpan, merchantId, merchantName, targetFraudRate, hardness } = ctx;
  const strategy = profile.fraudStrategy;
  const difficulty = profile.fraudDifficulty;
  const subtlety = difficulty === "subtle" ? 0.32 + hardness * 0.02 : difficulty === "medium" ? 0.58 : 0.86;
  const cleanRefund = profile.segment === "occasional_refunder" ? rng.chance(0.18) : rng.chance(0.055 + tier * 0.004);
  let isFraud = false;
  if (strategy) {
    const startAbuseAt = strategy === "serial_refund_abuse" ? Math.min(14, Math.max(2, Math.floor(totalForCustomer * 0.55))) : 0;
    const baseRate = {
      serial_refund_abuse: orderIndex >= startAbuseAt ? 0.72 : 0.02,
      inr_fraud: 0.68,
      address_cluster: 0.62,
      plus_alias_abuse: 0.58,
      disposable_email_abuse: 0.66,
      payment_churn: 0.64,
      cross_merchant_overlap: 0.46,
      velocity_attack: 0.82,
      mixed_borderline: 0.38,
    }[strategy] || 0.35;
    isFraud = rng.chance(Math.min(0.92, baseRate + targetFraudRate + hardness * 0.01));
  }

  const cadenceDay = strategy === "velocity_attack" && isFraud
    ? rng.int(0, Math.max(3, 20 - hardness))
    : Math.floor((orderIndex / Math.max(1, totalForCustomer)) * daySpan + rng.normal(0, 14));
  const orderDate = addDays(startDate, Math.max(0, Math.min(daySpan, cadenceDay)));
  const deliveryDate = addDays(orderDate, rng.int(1, 7));
  const claimDelay = strategy === "inr_fraud" ? rng.int(2, 9) : rng.int(4, 32);
  const refundDelay = rng.int(2, 18);
  const hasClaim = isFraud
    ? rng.chance(strategy === "payment_churn" ? 0.35 : strategy === "address_cluster" ? 0.48 : 0.76)
    : cleanRefund && rng.chance(0.54);
  const hasRefund = isFraud
    ? rng.chance(strategy === "serial_refund_abuse" ? 0.82 : 0.58)
    : cleanRefund;
  const name = rng.chance(strategy ? subtlety : settings.typoRate) ? mutateName(profile.first, profile.last, rng, subtlety) : profile.baseName;
  const email = strategy
    ? mutateEmail(profile.baseEmail, profile.first, profile.last, rng, strategy === "plus_alias_abuse" ? "plus_alias_abuse" : strategy, subtlety)
    : rng.chance(0.05) ? mutateEmail(profile.baseEmail, profile.first, profile.last, rng, profile.mutationStrategy, 0.18) : profile.baseEmail;
  const shippingAddress = rng.chance(strategy ? subtlety : settings.typoRate)
    ? mutateAddress(profile.baseAddress, rng, subtlety)
    : profile.baseAddress;
  const billingMismatch = isFraud
    ? rng.chance(strategy === "payment_churn" ? 0.62 : 0.28)
    : rng.chance(profile.sharedContext === "family" ? 0.09 : 0.04);
  const paymentMethod = strategy === "payment_churn"
    ? rng.pick(["card", "paypal", "klarna", "apple_pay"])
    : rng.weighted(PAYMENT_METHODS.map((p) => [p, p === "card" ? 44 : p === "paypal" ? 18 : 8]));
  const ipType = isFraud && rng.chance(difficulty === "subtle" ? 0.18 : 0.42) ? rng.pick(["vpn", "mobile"]) : rng.pick(["residential", "mobile"]);
  const ipAddress = strategy === "velocity_attack" && isFraud && profile.ipPool[0] ? profile.ipPool[0] : makeIp(rng, ipType);
  const basket = basketFor(rng, strategy || "normal");
  const orderTotal = valueFor(rng, profile.segment, strategy || "normal");
  const signatureRequired = Number(orderTotal) > 120 || (isFraud && rng.chance(0.25));
  const deliveryMethod = rng.weighted([["Standard Delivery", 70], ["Express Delivery", isFraud ? 22 : 12], ["Click & Collect", 8], ["Next Day", isFraud ? 15 : 7]]);
  const courier = rng.pick(COURIERS);
  const orderId = `ORD-${tier}-${String(ctx.nextOrderId++).padStart(8, "0")}`;
  const expectedSignals = [];
  if (isFraud) {
    if (strategy.includes("refund") || hasRefund) expectedSignals.push("refund_rate", "claim_rate");
    if (strategy === "inr_fraud") expectedSignals.push("item_not_received_claim_timing", "delivery_claim_mismatch");
    if (strategy === "address_cluster") expectedSignals.push("shared_or_mutated_shipping_address");
    if (strategy === "plus_alias_abuse") expectedSignals.push("email_alias_normalisation");
    if (strategy === "disposable_email_abuse") expectedSignals.push("disposable_email_domain");
    if (strategy === "payment_churn") expectedSignals.push("payment_fingerprint_or_method_churn");
    if (strategy === "cross_merchant_overlap") expectedSignals.push("cross_merchant_identity_overlap");
    if (strategy === "velocity_attack") expectedSignals.push("order_velocity", "shared_ip_device");
    if (strategy === "mixed_borderline") expectedSignals.push("weak_combined_identity_drift");
  }

  const row = {
    order_id: orderId,
    order_date: isoDate(orderDate),
    customer_email: email,
    customer_name: name,
    shipping_address: shippingAddress,
    order_total: orderTotal,
    currency: "GBP",
    order_status: hasRefund ? rng.pick(["refunded", "partially_refunded", "returned"]) : rng.weighted([["delivered", 72], ["fulfilled", 15], ["processing", 6], ["cancelled", 4], ["in_transit", 3]]),
    customer_phone: rng.chance(strategy ? 0.26 : 0.08) ? "" : profile.phone,
    billing_address: billingMismatch ? makeAddress(rng, rng.pick(["residential", "flat", "business"])) : profile.baseBillingAddress,
    refund_status: hasRefund ? rng.pick(["requested", "approved", "paid", "rejected"]) : "",
    refund_reason: hasRefund ? (strategy === "inr_fraud" ? "Item not received" : rng.pick(["Changed mind", "Damaged item", "Wrong item", "Late delivery", "Item not as described"])) : "",
    refund_date: hasRefund ? isoDate(addDays(orderDate, refundDelay)) : "",
    refund_amount: hasRefund ? money(Number(orderTotal) * rng.weighted([[1, 70], [0.5, 18], [0.25, 12]])) : "",
    payment_method: paymentMethod,
    ip_address: rng.chance(strategy && difficulty !== "obvious" ? 0.18 : 0.02) ? "" : ipAddress,
    device_id: rng.chance(strategy && difficulty === "subtle" ? 0.34 : 0.06) ? "" : profile.deviceId,
    merchant_id: strategy === "cross_merchant_overlap" && rng.chance(0.55) ? `merchant_${rng.int(2, 9)}` : merchantId,
    merchant_name: merchantName,
    platform_customer_id: profile.platformCustomerId,
    billing_name: billingMismatch ? mutateName(rng.pick(FIRST_NAMES), rng.pick(LAST_NAMES), rng, 0.12) : name,
    shipping_name: name,
    card_bin: profile.cardBin,
    card_bin_country: profile.cardBinCountry,
    payment_fingerprint: strategy === "payment_churn" && rng.chance(0.58) ? `pay_churn_${orderId}` : profile.paymentFingerprint,
    payment_attempts: isFraud && strategy === "payment_churn" ? rng.int(2, 6) : rng.weighted([[1, 86], [2, 10], [3, 4]]),
    failed_payment_count: isFraud && strategy === "payment_churn" ? rng.int(1, 4) : rng.weighted([[0, 92], [1, 7], [2, 1]]),
    coupon_code: rng.chance(profile.segment === "low_ticket" ? 0.32 : 0.16) ? rng.pick(["WELCOME10", "SPRING15", "SAVE20", "FREESHIP", "AFFVIP"]) : "",
    discount_amount: rng.chance(0.18) ? money(Number(orderTotal) * rng.weighted([[0.1, 50], [0.15, 30], [0.2, 20]])) : "",
    referral_source: rng.weighted([["organic", 38], ["paid_social", 16], ["google", 20], ["email", 14], ["affiliate", 6], ["direct", 6]]),
    affiliate_id: rng.chance(0.08) ? `aff_${rng.int(100, 999)}` : "",
    session_id: `sess_${stableId("", `${orderId}-${email}`, 18).slice(1)}`,
    account_created_at: profile.accountCreatedAt || isoDate(addDays(orderDate, -rng.int(isFraud ? 1 : 15, isFraud ? 90 : 900))),
    account_age_days: "",
    delivery_method: deliveryMethod,
    courier,
    tracking_status: hasClaim && strategy === "inr_fraud" ? rng.pick(["delivered", "no_scan", "delayed", "lost"]) : rng.weighted([["delivered", 76], ["in_transit", 9], ["delayed", 6], ["returned", 5], ["no_scan", 4]]),
    signature_required: signatureRequired ? "true" : "false",
    delivery_date: isoDate(deliveryDate),
    claim_status: hasClaim ? rng.pick(["open", "approved", "rejected", "under_review", "closed"]) : "",
    claim_reason: hasClaim ? (strategy === "inr_fraud" ? "Item not received" : rng.pick(["Damaged item", "Item not received", "Wrong item received", "Incomplete order"])) : "",
    claim_date: hasClaim ? isoDate(addDays(deliveryDate, claimDelay)) : "",
    claim_amount: hasClaim ? money(Number(orderTotal) * rng.weighted([[1, 65], [0.5, 25], [0.25, 10]])) : "",
    sku_count: basket.skuCount,
    skus: basket.skus,
    category_mix: basket.categoryMix,
    basket_items: basket.basketItems,
    user_agent: rng.pick(USER_AGENTS),
    browser_fingerprint: `bf_${stableId("", `${profile.deviceId}-${rng.int(1, 8)}`, 16).slice(1)}`,
    ip_asn: ipType === "vpn" ? rng.pick(["AS9009", "AS20473", "AS14061"]) : rng.pick(["AS5089", "AS2856", "AS5607", "AS12576"]),
    ip_isp: ipType === "vpn" ? rng.pick(["M247", "Vultr", "DigitalOcean"]) : rng.pick(["BT", "Sky Broadband", "Virgin Media", "EE", "Vodafone", "TalkTalk"]),
    ip_country: "GB",
    ip_city: rng.pick(["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Glasgow"]),
    geo_distance_km: isFraud && rng.chance(0.32) ? rng.int(90, 520) : rng.int(0, 45),
    billing_shipping_distance_km: billingMismatch ? rng.int(35, 480) : rng.int(0, 12),
    vat_number: rng.chance(0.035) ? `GB${rng.int(100000000, 999999999)}` : "",
    business_account: profile.sharedContext === "business" || rng.chance(0.04) ? "true" : "false",
    support_ticket_count: hasClaim ? rng.int(1, 5) : rng.weighted([[0, 86], [1, 11], [2, 3]]),
    previous_refund_count: "",
    previous_claim_count: "",
    checkout_seconds: isFraud && rng.chance(0.45) ? rng.int(24, 80) : rng.int(95, 520),
    cart_edits: isFraud && rng.chance(0.35) ? rng.int(4, 12) : rng.int(0, 4),
    abandoned_checkout_count: rng.weighted([[0, 72], [1, 18], [2, 7], [3, 3]]),
    marketing_consent: rng.chance(0.62) ? "true" : "false",
  };
  row.account_age_days = String(Math.max(0, daysBetween(row.account_created_at, row.order_date)));
  applyMaturity(row, rng, settings);
  return {
    row,
    truth: {
      order_id: orderId,
      canonical_customer_id: profile.canonicalId,
      is_fraud: isFraud,
      fraud_strategy: isFraud ? strategy : null,
      difficulty: isFraud ? difficulty : "clean",
      expected_signals: expectedSignals,
    },
  };
}

function tuneOrderCounts(profiles, targetOrders, rng) {
  const counts = profiles.map((profile) => orderCountFor(profile, rng));
  let total = counts.reduce((a, b) => a + b, 0);
  while (total < targetOrders) {
    const idx = rng.int(0, counts.length - 1);
    counts[idx] += profiles[idx].fraudStrategy ? rng.int(1, 3) : 1;
    total += counts[idx] - (counts[idx] - (profiles[idx].fraudStrategy ? Math.min(3, counts[idx]) : 1));
    total = counts.reduce((a, b) => a + b, 0);
  }
  while (total > targetOrders) {
    const idx = rng.int(0, counts.length - 1);
    if (counts[idx] > 1) {
      counts[idx] -= 1;
      total -= 1;
    }
  }
  return counts;
}

async function generateOne(rawOptions, tier) {
  const options = { ...rawOptions, tier };
  const rng = new RNG(`${options.seed}:tier:${tier}:hardness:${options.hardness}:focus:${options.focus}`);
  const settings = tierSettings(Number(tier));
  const outputDir = path.resolve(String(options["output-dir"]));
  ensureDir(outputDir);

  const suffix = rawOptions.tier === "all" ? `_tier${tier}` : "";
  const prefix = `${options.prefix}${suffix}`;
  const csvPath = path.join(outputDir, `${prefix}.csv`);
  const truthPath = path.join(outputDir, `${prefix.replace("merchant_dataset", "merchant_truth")}.json`);
  const identityPath = path.join(outputDir, `${prefix.replace("merchant_dataset", "identity_truth")}.json`);

  const ordersTarget = Number(options.orders);
  const customersTarget = Number(options.customers);
  const fraudRate = Number(options["fraud-rate"]);
  const hardness = Number(options.hardness || 0);
  const focusStrategies = String(options.focus || "").split(",").map((s) => s.trim()).filter(Boolean);
  const merchantId = `merchant_tier_${tier}`;
  const merchantName = settings.merchantName;

  const profiles = buildProfiles(rng, customersTarget, Number(tier), hardness, focusStrategies);
  const counts = tuneOrderCounts(profiles, ordersTarget, rng);
  const daySpan = rng.int(180, 365);
  const startDate = addDays(new Date(`${new Date().getUTCFullYear() - 1}-01-01T00:00:00Z`), rng.int(0, 80));
  const ctx = {
    rng,
    tier: Number(tier),
    settings,
    startDate,
    daySpan,
    merchantId,
    merchantName,
    targetFraudRate: fraudRate,
    hardness,
    nextOrderId: 1,
    fraudOrderTarget: Math.max(1, Math.round(ordersTarget * fraudRate)),
    fraudOrderMax: Math.max(1, Math.floor(ordersTarget * 0.05)),
    actualFraudOrders: 0,
    fraudStrategyCounts: Object.fromEntries(FRAUD_STRATEGIES.map((strategy) => [strategy, 0])),
    minStrategyOrders: Math.max(1, Math.floor((Math.max(1, Math.round(ordersTarget * fraudRate)) / FRAUD_STRATEGIES.length) * 0.45)),
  };

  const stream = fs.createWriteStream(csvPath);
  stream.write(MERCHANT_COLUMNS.join(",") + "\n");

  const truth = {
    dataset: path.basename(csvPath),
    generated_at: new Date().toISOString(),
    seed: options.seed,
    tier: Number(tier),
    data_maturity: settings.name,
    requested_orders: ordersTarget,
    requested_customers: customersTarget,
    requested_fraud_rate: fraudRate,
    known_bad_customers: [],
    fraud_order_ids: [],
    fraud_strategies: {},
    expected_signals: {},
    clean_edge_cases: [],
    schema_columns: MERCHANT_COLUMNS,
  };

  const identityTruth = {
    dataset: path.basename(csvPath),
    generated_at: new Date().toISOString(),
    seed: options.seed,
    tier: Number(tier),
    canonical_customers: [],
    expected_non_links: [],
    mutation_summary: {},
  };

  const identityMap = new Map();
  const fraudCustomerMap = new Map();
  const previousByCustomer = new Map();

  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    const total = counts[i];
    const linkedRecords = [];
    const aliases = new Map();
    for (let o = 0; o < total; o += 1) {
      const { row, truth: orderTruth } = makeOrder(profile, o, total, ctx);
      const strategyCount = orderTruth.fraud_strategy ? ctx.fraudStrategyCounts[orderTruth.fraud_strategy] || 0 : 0;
      const keepForStrategyBalance = orderTruth.fraud_strategy && strategyCount < ctx.minStrategyOrders;
      if (orderTruth.is_fraud && (ctx.actualFraudOrders >= ctx.fraudOrderMax || (ctx.actualFraudOrders >= ctx.fraudOrderTarget && !keepForStrategyBalance))) {
        orderTruth.is_fraud = false;
        orderTruth.fraud_strategy = null;
        orderTruth.difficulty = "clean";
        orderTruth.expected_signals = [];
        row.refund_status = "";
        row.refund_reason = "";
        row.refund_date = "";
        row.refund_amount = "";
        row.claim_status = "";
        row.claim_reason = "";
        row.claim_date = "";
        row.claim_amount = "";
        row.payment_attempts = "1";
        row.failed_payment_count = "0";
        row.geo_distance_km = String(rng.int(0, 40));
        row.billing_shipping_distance_km = String(rng.int(0, 12));
        row.checkout_seconds = String(rng.int(110, 520));
        row.order_status = "delivered";
      }
      if (orderTruth.is_fraud) {
        ctx.actualFraudOrders += 1;
        ctx.fraudStrategyCounts[orderTruth.fraud_strategy] = (ctx.fraudStrategyCounts[orderTruth.fraud_strategy] || 0) + 1;
      }
      const prev = previousByCustomer.get(profile.canonicalId) || { refunds: 0, claims: 0 };
      row.previous_refund_count = String(prev.refunds);
      row.previous_claim_count = String(prev.claims);
      if (row.refund_status) prev.refunds += 1;
      if (row.claim_status) prev.claims += 1;
      previousByCustomer.set(profile.canonicalId, prev);

      stream.write(csvRow(MERCHANT_COLUMNS, row));
      linkedRecords.push(row.order_id);
      aliases.set(`${row.customer_email}|${row.customer_name}|${row.shipping_address}`, {
        customer_email: row.customer_email,
        customer_name: row.customer_name,
        shipping_address: row.shipping_address,
        customer_phone: row.customer_phone,
        device_id: row.device_id,
        payment_fingerprint: row.payment_fingerprint,
      });
      if (orderTruth.is_fraud) {
        truth.fraud_order_ids.push(row.order_id);
        truth.fraud_strategies[row.order_id] = {
          canonical_customer_id: profile.canonicalId,
          strategy: orderTruth.fraud_strategy,
          difficulty: orderTruth.difficulty,
        };
        truth.expected_signals[row.order_id] = orderTruth.expected_signals;
        if (!fraudCustomerMap.has(profile.canonicalId)) {
          fraudCustomerMap.set(profile.canonicalId, {
            canonical_customer_id: profile.canonicalId,
            strategy: orderTruth.fraud_strategy,
            difficulty: orderTruth.difficulty,
            order_ids: [],
            expected_signals: new Set(),
          });
        }
        const fc = fraudCustomerMap.get(profile.canonicalId);
        fc.order_ids.push(row.order_id);
        for (const sig of orderTruth.expected_signals) fc.expected_signals.add(sig);
      }
    }
    identityMap.set(profile.canonicalId, {
      canonical_customer_id: profile.canonicalId,
      expected_linked_records: linkedRecords,
      aliases: Array.from(aliases.values()).slice(0, 40),
      mutation_strategy_used: profile.mutationStrategy,
      legitimate_shared_context: profile.sharedContext,
      fraud_strategy: profile.fraudStrategy,
    });
    identityTruth.mutation_summary[profile.mutationStrategy] = (identityTruth.mutation_summary[profile.mutationStrategy] || 0) + 1;
  }

  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on("error", reject);
  });

  truth.known_bad_customers = Array.from(fraudCustomerMap.values()).map((item) => ({
    ...item,
    expected_signals: Array.from(item.expected_signals),
  }));
  identityTruth.canonical_customers = Array.from(identityMap.values());

  const sharedGroups = identityTruth.canonical_customers.filter((c) => c.legitimate_shared_context);
  for (let i = 0; i < Math.min(300, sharedGroups.length - 1); i += 2) {
    const a = sharedGroups[i];
    const b = sharedGroups[i + 1];
    if (!a || !b || !a.expected_linked_records[0] || !b.expected_linked_records[0]) continue;
    identityTruth.expected_non_links.push({
      record_a: a.expected_linked_records[0],
      record_b: b.expected_linked_records[0],
      reason: a.legitimate_shared_context || b.legitimate_shared_context,
    });
    truth.clean_edge_cases.push({
      order_ids: [a.expected_linked_records[0], b.expected_linked_records[0]],
      reason: a.legitimate_shared_context || b.legitimate_shared_context,
    });
  }

  const achievedFraudRate = truth.fraud_order_ids.length / ordersTarget;
  truth.achieved_fraud_rate = achievedFraudRate;
  writeJson(truthPath, truth);
  writeJson(identityPath, identityTruth);

  if (rawOptions.tier === "all" && Number(tier) === 2) {
    fs.copyFileSync(csvPath, path.join(outputDir, `${rawOptions.prefix}.csv`));
    fs.copyFileSync(truthPath, path.join(outputDir, "merchant_truth.json"));
    fs.copyFileSync(identityPath, path.join(outputDir, "identity_truth.json"));
  }

  return { csvPath, truthPath, identityPath, orders: ordersTarget, customers: customersTarget, fraudRate: achievedFraudRate };
}

async function main() {
  const options = parseArgs(defaultConfig);
  const tiers = String(options.tier) === "all" ? [1, 2, 3] : [Number(options.tier || 2)];
  const outputs = [];
  for (const tier of tiers) {
    outputs.push(await generateOne(options, tier));
  }
  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { generateOne, tierSettings };
