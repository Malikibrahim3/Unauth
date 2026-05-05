const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_OUTPUT_DIR,
  FRAUD_STRATEGIES,
  DISPOSABLE_DOMAINS,
  parseArgs,
  ensureDir,
  writeJson,
  readJson,
  loadScoringWeights,
  csvRow,
  streamCsv,
  normalizeEmail,
  normalizePhone,
  normalizeAddress,
  nameTokens,
  stableId,
  daysBetween,
  precisionRecallF1,
  formatPct,
  roundMetric,
} = require("./common.ts");

const defaultOptions = {
  input: path.join(DEFAULT_OUTPUT_DIR, "merchant_dataset.csv"),
  truth: path.join(DEFAULT_OUTPUT_DIR, "merchant_truth.json"),
  "identity-truth": path.join(DEFAULT_OUTPUT_DIR, "identity_truth.json"),
  "output-dir": DEFAULT_OUTPUT_DIR,
  weights: path.join(DEFAULT_OUTPUT_DIR, "learned-scoring-weights.json"),
  threshold: 60,
  tier: "",
};

function addIndex(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function disposableDomain(email) {
  const domain = String(email || "").split("@")[1] || "";
  return DISPOSABLE_DOMAINS.includes(domain.toLowerCase());
}

function rowSignals(row, context, scoringWeights) {
  const email = normalizeEmail(row.customer_email);
  const phone = normalizePhone(row.customer_phone);
  const address = normalizeAddress(row.shipping_address);
  const orderDate = new Date(row.order_date);
  const amount = Number(row.order_total || 0);
  const accountAge = Number(row.account_age_days || 999);
  const previousClaims = Number(row.previous_claim_count || 0);
  const previousRefunds = Number(row.previous_refund_count || 0);
  const failedPayments = Number(row.failed_payment_count || 0);
  const paymentAttempts = Number(row.payment_attempts || 1);
  const checkoutSeconds = Number(row.checkout_seconds || 999);
  const billingDistance = Number(row.billing_shipping_distance_km || 0);
  const geoDistance = Number(row.geo_distance_km || 0);
  const claimDelay = row.claim_date ? daysBetween(row.delivery_date || row.order_date, row.claim_date) : 999;
  const isInr = /item not received/i.test(`${row.claim_reason} ${row.refund_reason}`);
  const hasRefund = Boolean(row.refund_status || row.refund_amount);
  const hasClaim = Boolean(row.claim_status || row.claim_reason);
  const highValue = amount > Math.max(120, context.amountP90 || 160);

  // Temporal velocity: days since this customer's last order (from incremental context).
  const lastOrderDate = context.lastOrderByEmail?.get(email);
  const daysSinceLast = lastOrderDate ? daysBetween(lastOrderDate, row.order_date) : 9999;
  // Rolling 90-day refund/claim count for this email (point-in-time).
  const rollingRefund90 = context.rollingRefund90ByEmail?.get(email) || 0;
  const rollingClaim90 = context.rollingClaim90ByEmail?.get(email) || 0;
  // Whether this is the customer's very first order.
  const isFirstOrder = (context.emailCounts.get(email) || 0) === 0;

  const signals = {};
  function score(name, points, reason) {
    if (!points) return;
    const multiplier = Number(scoringWeights[name] ?? 1);
    signals[name] = (signals[name] || 0) + points * multiplier;
    context.reasons.push(reason || name);
  }

  if (disposableDomain(row.customer_email)) score("disposable_email", 18, "Disposable email domain");
  if (String(row.customer_email || "").includes("+")) score("plus_alias", 7, "Plus alias email");
  if (accountAge < 14) score("young_account", 10, "Very young account");
  else if (accountAge < 45) score("young_account", 6, "Young account");

  // Use rolling 90-day window for claim/refund rates where available; fall back to cumulative counts.
  const effectiveClaims = Math.max(previousClaims, rollingClaim90);
  const effectiveRefunds = Math.max(previousRefunds, rollingRefund90);
  if (effectiveClaims >= 3) score("claim_rate", 18, "Repeated previous claims");
  else if (effectiveClaims >= 1) score("claim_rate", 7, "Prior claim history");
  if (effectiveRefunds >= 4) score("refund_rate", 18, "Repeated previous refunds");
  else if (effectiveRefunds >= 2) score("refund_rate", 9, "Prior refund history");

  // INR: score more precisely using delivery-to-claim gap and delivery status.
  const inrDeliveryEvidence = /delivered/i.test(row.tracking_status || "");
  if (isInr && claimDelay >= 0 && claimDelay <= 5) score("inr_timing", 22, "INR claim ≤5 days after delivery");
  else if (isInr && claimDelay >= 0 && claimDelay <= 10) score("inr_timing", 18, "INR claim shortly after delivery");
  else if (isInr && inrDeliveryEvidence) score("inr_timing", 14, "INR claim with confirmed delivery");
  else if (isInr) score("inr_timing", 11, "INR claim/refund reason");

  if (hasClaim && highValue) score("high_value_claim", 10, "High value claimed order");
  if (hasRefund && Number(row.refund_amount || 0) >= amount * 0.8) score("full_refund", 8, "Full or near-full refund");
  if (failedPayments >= 2 || paymentAttempts >= 4) score("payment_churn", 13, "Failed payment or payment churn");
  if (billingDistance > 80) score("billing_shipping_mismatch", 10, "Billing/shipping distance mismatch");
  else if (billingDistance > 25) score("billing_shipping_mismatch", 5, "Billing/shipping mismatch");
  if (geoDistance > 120) score("geo_mismatch", 8, "IP/shipping geolocation gap");
  if (checkoutSeconds && checkoutSeconds < 70) score("fast_checkout", 9, "Fast checkout");
  if (Number(row.cart_edits || 0) > 6) score("cart_edits", 5, "Many cart edits");
  if (/vpn|m247|vultr|digitalocean/i.test(`${row.ip_isp} ${row.ip_asn}`)) score("ip_risk", 10, "VPN/proxy-like network");
  if (/express|next day/i.test(row.delivery_method || "") && highValue) score("rushed_shipping", 6, "High value rushed shipping");

  // Velocity: order inter-arrival too fast (< 2 days since last order for same customer).
  if (!isFirstOrder && daysSinceLast >= 0 && daysSinceLast <= 2) score("order_velocity", 10, "Rapid order inter-arrival");
  else if (!isFirstOrder && daysSinceLast >= 0 && daysSinceLast <= 7) score("order_velocity", 5, "Fast order inter-arrival");

  // First-order claim/refund is inherently suspicious: no history to establish legitimacy.
  if (isFirstOrder && (hasClaim || hasRefund)) score("first_order_claim", 12, "Claim/refund on first order");

  const emailGroup = context.emailCounts.get(email) || 0;
  const phoneGroup = phone ? (context.phoneCounts.get(phone) || 0) : 0;
  const addressGroup = context.addressCounts.get(address) || 0;
  const deviceGroup = row.device_id ? (context.deviceCounts.get(row.device_id) || 0) : 0;
  const paymentGroup = row.payment_fingerprint ? (context.paymentCounts.get(row.payment_fingerprint) || 0) : 0;
  const ipRecent = row.ip_address ? (context.ipCounts.get(row.ip_address) || 0) : 0;

  if (emailGroup >= 4) score("email_reuse", Math.min(13, emailGroup), "Email normalized across many orders");
  if (phoneGroup >= 5) score("phone_reuse", 7, "Phone reused across many orders");
  if (addressGroup >= 14 && row.business_account !== "true") score("address_cluster", Math.min(16, Math.floor(addressGroup / 5)), "Address cluster");
  if (deviceGroup >= 7) score("shared_device", Math.min(10, Math.floor(deviceGroup / 3)), "Shared device");
  if (paymentGroup >= 6) score("shared_payment", Math.min(12, Math.floor(paymentGroup / 3)), "Shared payment fingerprint");
  if (ipRecent >= 8 && !/mobile|ee|vodafone/i.test(`${row.ip_isp}`)) score("ip_velocity", Math.min(12, Math.floor(ipRecent / 2)), "Shared IP velocity");

  const clusterEvidenceCount = [deviceGroup >= 4, addressGroup >= 10, paymentGroup >= 4, previousClaims >= 2, previousRefunds >= 2].filter(Boolean).length;
  if ((hasClaim || hasRefund) && clusterEvidenceCount >= 2) score("cluster_claim_corroboration", 8, "Claim corroborated by shared identity cluster");
  if (row.business_account === "true" && addressGroup >= 10) score("business_address_guard", -12, "Business/shared address dampener");
  if (/student|unite|room/i.test(row.shipping_address || "") && addressGroup >= 10) score("student_address_guard", -12, "Student/shared accommodation dampener");
  if (row.order_status === "cancelled" && !hasClaim && !hasRefund) score("cancelled_order_guard", -5, "Cancelled order dampener");

  const broadSignals = ["email_reuse", "phone_reuse", "address_cluster", "shared_device", "shared_payment", "ip_velocity", "cluster_claim_corroboration"];
  const strongSignals = ["claim_rate", "refund_rate", "inr_timing", "payment_churn", "disposable_email", "ip_risk"];
  const hasCurrentClaimBehavior = hasClaim || hasRefund || isInr;
  const hasStrongEvidence = strongSignals.some((name) => Number(signals[name] || 0) > 0)
    && (hasCurrentClaimBehavior || Number(signals.disposable_email || 0) > 0 || Number(signals.ip_risk || 0) > 0);
  const broadTotal = broadSignals.reduce((sum, name) => sum + Math.max(0, Number(signals[name] || 0)), 0);
  const historyTotal = Math.max(0, Number(signals.claim_rate || 0)) + Math.max(0, Number(signals.refund_rate || 0));

  // Single unified broad-signal penalty: if no strong corroborating evidence, discount overlap signals.
  // Replaces the four overlapping penalties that were compounding to ~1.95× subtraction on the same broadTotal.
  const corroborationPenalty = hasStrongEvidence ? 0
    : historyTotal > 0 && !hasCurrentClaimBehavior ? (broadTotal + historyTotal) * 0.6
    : broadTotal * 0.6;

  const scoreTotal = Object.values(signals).reduce((sum, n) => sum + n, 0) - corroborationPenalty;
  return {
    riskScore: Math.max(0, Math.min(100, Math.round(scoreTotal))),
    signals,
    email,
    phone,
    address,
    nameKey: nameTokens(row.customer_name).sort().join(" "),
  };
}

function unionFind() {
  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x);
    if (p !== x) parent.set(x, find(p));
    return parent.get(x);
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  }
  return { find, union, parent };
}

// Signal weights for identity merging. Two independent signals are required
// before merging two orders into the same customer cluster.
const IDENTITY_SIGNAL_WEIGHTS = {
  email: 0.95,
  platform: 0.99,
  phone: 0.90,
  paymentName: 0.85,
  deviceName: 0.55,
  addressName: 0.45,
};
// Combined confidence threshold to merge (requires ~2 independent signals).
const IDENTITY_MERGE_THRESHOLD = 1.2;
// Student and shared-venue slugs from generate.ts that should never be a sole merge signal.
const SHARED_VENUE_PATTERNS = /liberty court|unite students|the glassworks|kelvin hall/;

function buildIdentityPredictions(rows, features) {
  // Build candidate edge lists keyed by each signal.
  const byEmail = new Map();
  const byPhone = new Map();
  const byDeviceName = new Map();
  const byPaymentName = new Map();
  const byAddressName = new Map();
  const byPlatform = new Map();

  // Track which signals fire for each order pair via an edge map.
  // edgeWeights: Map<"ordA|ordB", number> accumulates confidence per pair.
  const edgeWeights = new Map();

  function addEdges(mapRef, key, orderId, weight) {
    if (!mapRef.has(key)) mapRef.set(key, []);
    const group = mapRef.get(key);
    // Register edges between this order and all prior members of this group.
    const limit = Math.min(group.length, 80);
    for (let i = 0; i < limit; i += 1) {
      const other = group[i];
      const edgeKey = orderId < other ? `${orderId}|${other}` : `${other}|${orderId}`;
      edgeWeights.set(edgeKey, (edgeWeights.get(edgeKey) || 0) + weight);
    }
    group.push(orderId);
  }

  const rowByOrder = new Map();
  for (const row of rows) {
    const f = features.get(row.order_id);
    rowByOrder.set(row.order_id, row);

    addEdges(byEmail, f.email, row.order_id, IDENTITY_SIGNAL_WEIGHTS.email);
    if (f.phone.length >= 10) addEdges(byPhone, f.phone, row.order_id, IDENTITY_SIGNAL_WEIGHTS.phone);
    if (row.platform_customer_id) addEdges(byPlatform, row.platform_customer_id, row.order_id, IDENTITY_SIGNAL_WEIGHTS.platform);
    if (row.device_id && f.nameKey) addEdges(byDeviceName, `${row.device_id}|${f.nameKey}`, row.order_id, IDENTITY_SIGNAL_WEIGHTS.deviceName);
    if (row.payment_fingerprint && f.nameKey) addEdges(byPaymentName, `${row.payment_fingerprint}|${f.nameKey}`, row.order_id, IDENTITY_SIGNAL_WEIGHTS.paymentName);
    if (f.address && f.nameKey && !SHARED_VENUE_PATTERNS.test(f.address)) {
      addEdges(byAddressName, `${f.address}|${f.nameKey}`, row.order_id, IDENTITY_SIGNAL_WEIGHTS.addressName);
    }
  }

  // Only union pairs whose combined confidence meets the threshold.
  const uf = unionFind();
  for (const row of rows) uf.find(row.order_id);

  for (const [edgeKey, confidence] of edgeWeights) {
    if (confidence < IDENTITY_MERGE_THRESHOLD) continue;
    const sep = edgeKey.indexOf("|");
    const a = edgeKey.slice(0, sep);
    const b = edgeKey.slice(sep + 1);
    // Anti-merge: if the only reason to merge is a shared mobile/office ISP, skip it.
    const rowA = rowByOrder.get(a);
    const rowB = rowByOrder.get(b);
    if (rowA && rowB) {
      const isp = `${rowA.ip_isp || ""} ${rowB.ip_isp || ""}`.toLowerCase();
      if (/\bee\b|vodafone|bt |sky broadband|virgin media|talktalk/.test(isp)
          && !byEmail.has(features.get(a)?.email)
          && confidence < 1.5) continue;
      const bothBusiness = rowA.business_account === "true" && rowB.business_account === "true";
      if (bothBusiness && confidence < 1.6) continue;
    }
    uf.union(a, b);
  }

  // Break oversized clusters: if a cluster exceeds 14 members, keep only the
  // highest-confidence sub-clusters by iterating edges in descending confidence.
  const clusterMembers = new Map();
  for (const row of rows) {
    const root = uf.find(row.order_id);
    if (!clusterMembers.has(root)) clusterMembers.set(root, []);
    clusterMembers.get(root).push(row.order_id);
  }
  const MAX_CLUSTER = 14;
  for (const [root, members] of clusterMembers) {
    if (members.length <= MAX_CLUSTER) continue;
    // Re-run union-find for just this oversized cluster using only high-confidence edges.
    const subUf = unionFind();
    for (const m of members) subUf.find(m);
    const edges = [];
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
        const w = edgeWeights.get(edgeKey) || 0;
        if (w >= IDENTITY_MERGE_THRESHOLD) edges.push([a, b, w]);
      }
    }
    edges.sort((x, y) => y[2] - x[2]);
    // Use Kruskal-style to build sub-clusters up to MAX_CLUSTER size.
    for (const [a, b] of edges) {
      const ra = subUf.find(a);
      const rb = subUf.find(b);
      if (ra === rb) continue;
      const sizeA = [...subUf.parent.keys()].filter((k) => subUf.find(k) === ra).length;
      const sizeB = [...subUf.parent.keys()].filter((k) => subUf.find(k) === rb).length;
      if (sizeA + sizeB <= MAX_CLUSTER) subUf.union(a, b);
    }
    // Remap the main uf for this cluster's members using subUf roots.
    for (const m of members) {
      const subRoot = subUf.find(m);
      if (subRoot !== m) uf.union(subRoot, m);
    }
  }

  const clusterByOrder = new Map();
  const clusters = new Map();
  for (const row of rows) {
    const root = uf.find(row.order_id);
    const predId = stableId("pcid", root, 10);
    clusterByOrder.set(row.order_id, predId);
    if (!clusters.has(predId)) clusters.set(predId, []);
    clusters.get(predId).push(row.order_id);
  }
  return { clusterByOrder, clusters };
}

function comb2(n) {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

function evaluateIdentity(identityTruth, identityPred) {
  const truthByOrder = new Map();
  for (const customer of identityTruth.canonical_customers || []) {
    for (const orderId of customer.expected_linked_records || []) truthByOrder.set(orderId, customer.canonical_customer_id);
  }

  const predTruthIntersections = new Map();
  const predSizes = new Map();
  const truthSizes = new Map();
  for (const [orderId, truthId] of truthByOrder) {
    const predId = identityPred.clusterByOrder.get(orderId);
    if (!predId) continue;
    predSizes.set(predId, (predSizes.get(predId) || 0) + 1);
    truthSizes.set(truthId, (truthSizes.get(truthId) || 0) + 1);
    const key = `${predId}|${truthId}`;
    predTruthIntersections.set(key, (predTruthIntersections.get(key) || 0) + 1);
  }

  let tpPairs = 0;
  for (const n of predTruthIntersections.values()) tpPairs += comb2(n);
  const predictedPairs = Array.from(predSizes.values()).reduce((sum, n) => sum + comb2(n), 0);
  const truthPairs = Array.from(truthSizes.values()).reduce((sum, n) => sum + comb2(n), 0);
  const metrics = precisionRecallF1(tpPairs, Math.max(0, predictedPairs - tpPairs), Math.max(0, truthPairs - tpPairs));

  const falseMerges = [];
  for (const [predId, orderIds] of identityPred.clusters) {
    const truthIds = new Set(orderIds.map((id) => truthByOrder.get(id)).filter(Boolean));
    if (truthIds.size > 1) {
      falseMerges.push({ predicted_identity_id: predId, sample_order_ids: orderIds.slice(0, 12), truth_customer_count: truthIds.size });
      if (falseMerges.length >= 25) break;
    }
  }

  const byTruth = new Map();
  for (const [orderId, truthId] of truthByOrder) {
    if (!byTruth.has(truthId)) byTruth.set(truthId, new Set());
    byTruth.get(truthId).add(identityPred.clusterByOrder.get(orderId));
  }
  const missedLinks = [];
  for (const customer of identityTruth.canonical_customers || []) {
    const predSet = byTruth.get(customer.canonical_customer_id);
    if (predSet && predSet.size > 1 && (customer.expected_linked_records || []).length > 1) {
      missedLinks.push({
        canonical_customer_id: customer.canonical_customer_id,
        mutation_strategy_used: customer.mutation_strategy_used,
        split_count: predSet.size,
        sample_order_ids: customer.expected_linked_records.slice(0, 12),
      });
      if (missedLinks.length >= 30) break;
    }
  }

  let expectedNonLinkErrors = 0;
  const nonLinkSamples = [];
  for (const item of identityTruth.expected_non_links || []) {
    if (identityPred.clusterByOrder.get(item.record_a) === identityPred.clusterByOrder.get(item.record_b)) {
      expectedNonLinkErrors += 1;
      nonLinkSamples.push(item);
    }
  }

  return {
    ...metrics,
    merge_accuracy: metrics.f1,
    false_merges: falseMerges,
    missed_links: missedLinks,
    expected_non_link_errors: expectedNonLinkErrors,
    expected_non_link_samples: nonLinkSamples.slice(0, 20),
    pair_counts: { true_positive_pairs: tpPairs, predicted_pairs: predictedPairs, actual_pairs: truthPairs },
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return "_None._\n";
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(row[col] ?? "").replace(/\|/g, "/")).join(" | ")} |`);
  return [header, sep, ...body].join("\n") + "\n";
}

function writeEvalReport(file, summary, missed, falsePositives, weakSignals, patternMetrics) {
  const lines = [];
  lines.push(`# ParcelClaim Synthetic Evaluation Report`);
  lines.push("");
  lines.push(`Dataset: \`${path.basename(summary.input)}\``);
  lines.push(`Orders evaluated: ${summary.orders}`);
  lines.push(`Fraud prevalence: ${formatPct(summary.fraud_prevalence)}`);
  lines.push("");
  lines.push(`## Metrics`);
  lines.push(markdownTable([
    {
      precision: summary.precision,
      recall: summary.recall,
      f1: summary.f1,
      false_positive_rate: summary.false_positive_rate,
      threshold: summary.threshold,
    },
  ], ["precision", "recall", "f1", "false_positive_rate", "threshold"]));
  lines.push(`## Pattern Metrics`);
  lines.push(markdownTable(patternMetrics.map((p) => ({
    pattern: p.strategy,
    precision: p.precision,
    recall: p.recall,
    f1: p.f1,
    truth_orders: p.truth,
    predicted_orders: p.predicted,
  })), ["pattern", "precision", "recall", "f1", "truth_orders", "predicted_orders"]));
  lines.push(`## Missed Fraud`);
  lines.push(markdownTable(missed.slice(0, 40).map((m) => ({
    order_id: m.order_id,
    customer: m.canonical_customer_id,
    strategy: m.strategy,
    risk_score: m.riskScore,
    likely_missing_signals: m.likely_missing_signals.join(", "),
  })), ["order_id", "customer", "strategy", "risk_score", "likely_missing_signals"]));
  lines.push(`## False Positives`);
  lines.push(markdownTable(falsePositives.slice(0, 40).map((m) => ({
    order_id: m.order_id,
    customer_email: m.customer_email,
    risk_score: m.riskScore,
    why_likely_overfit: m.why.join(", "),
  })), ["order_id", "customer_email", "risk_score", "why_likely_overfit"]));
  lines.push(`## Weak Signals`);
  lines.push(weakSignals.length ? weakSignals.map((s) => `- ${s}`).join("\n") + "\n" : "_No major weak fraud signals found at this threshold._\n");
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join("\n"));
}

function writeIdentityReport(file, summary, identity) {
  const lines = [];
  lines.push(`# ParcelClaim Identity Resolution Report`);
  lines.push("");
  lines.push(`Dataset: \`${path.basename(summary.input)}\``);
  lines.push("");
  lines.push(`## Metrics`);
  lines.push(markdownTable([
    {
      identity_precision: identity.precision,
      identity_recall: identity.recall,
      merge_accuracy: identity.merge_accuracy,
      false_merges: identity.false_merges.length,
      missed_links: identity.missed_links.length,
      expected_non_link_errors: identity.expected_non_link_errors,
    },
  ], ["identity_precision", "identity_recall", "merge_accuracy", "false_merges", "missed_links", "expected_non_link_errors"]));
  lines.push(`## Missed Links`);
  lines.push(markdownTable(identity.missed_links.slice(0, 40).map((m) => ({
    canonical_customer_id: m.canonical_customer_id,
    mutation: m.mutation_strategy_used,
    split_count: m.split_count,
    sample_order_ids: m.sample_order_ids.join(", "),
  })), ["canonical_customer_id", "mutation", "split_count", "sample_order_ids"]));
  lines.push(`## False Merges`);
  lines.push(markdownTable(identity.false_merges.slice(0, 40).map((m) => ({
    predicted_identity_id: m.predicted_identity_id,
    truth_customer_count: m.truth_customer_count,
    sample_order_ids: m.sample_order_ids.join(", "),
  })), ["predicted_identity_id", "truth_customer_count", "sample_order_ids"]));
  lines.push(`## Weak Identity Signals`);
  const weak = [];
  if (identity.recall < 0.9) weak.push("Alias-heavy identities are being split. Strengthen normalized email, nickname, phone, device, and payment joins with confidence scoring.");
  if (identity.precision < 0.95) weak.push("Shared households, student accommodation, business addresses, or shared devices are being over-merged. Require multiple independent signals before merging.");
  if (identity.expected_non_link_errors > 0) weak.push("Explicit legitimate non-link edge cases were merged. Add anti-merge guards for families, students, office addresses, and shared networks.");
  if (!weak.length) weak.push("Identity signals are performing well on this generated tier.");
  lines.push(weak.map((s) => `- ${s}`).join("\n") + "\n");
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join("\n"));
}

function writeSchemaOpportunities(file, columns) {
  const underutilized = [
    "platform_customer_id",
    "payment_fingerprint",
    "device_id",
    "browser_fingerprint",
    "ip_asn",
    "billing_shipping_distance_km",
    "previous_refund_count",
    "previous_claim_count",
    "checkout_seconds",
    "delivery_date",
    "claim_date",
  ].filter((c) => columns.includes(c));
  const lines = [];
  lines.push(`# Schema Opportunities`);
  lines.push("");
  lines.push(`## Underutilised Existing Fields`);
  lines.push(underutilized.map((c) => `- \`${c}\`: high signal value for identity linking, behavioural baselines, or claim timing.`).join("\n"));
  lines.push("");
  lines.push(`## High-Value Fields Not Yet Fully Ingested`);
  lines.push("- `payment_fingerprint`: stable cross-alias signal from payment processors without storing raw card data.");
  lines.push("- `browser_fingerprint` and `user_agent`: useful as secondary evidence, especially when paired with email or payment data.");
  lines.push("- `ip_asn`, `ip_isp`, and coarse geolocation: helps separate mobile/VPN/workplace traffic from genuine home broadband.");
  lines.push("- `delivery_date`, `tracking_status`, `signature_required`, and `claim_date`: essential for INR timing and courier-evidence logic.");
  lines.push("- `previous_refund_count` and `previous_claim_count`: cheap merchant-exportable aggregates that avoid expensive history lookups.");
  lines.push("");
  lines.push(`## Recommended Identity Signals`);
  lines.push("- Normalize email aliases by domain rules, especially Gmail dots and plus aliases.");
  lines.push("- Use multi-signal joins: payment fingerprint + normalized name, device + normalized email, phone + address, and platform ID where present.");
  lines.push("- Add anti-link dampeners for student accommodation, office addresses, family households, and shared mobile/workplace IPs.");
  lines.push("");
  lines.push(`## Recommended Fraud Signals`);
  lines.push("- Claim/refund timing after delivery, especially INR claims within 2-10 days.");
  lines.push("- Sudden behaviour shift after many clean orders.");
  lines.push("- Payment churn, failed attempts, card BIN country mismatch, and high-value rushed shipping.");
  lines.push("- Address cluster growth over short windows with weak identity variation.");
  lines.push("");
  lines.push(`## Recommended Future CSV Columns`);
  lines.push("- `payment_fingerprint`, `device_id`, `browser_fingerprint`, `ip_asn`, `ip_isp`, `delivery_date`, `tracking_status`, `claim_date`, `claim_reason`, `previous_claim_count`, `previous_refund_count`, `account_created_at`, `checkout_seconds`, `billing_shipping_distance_km`.");
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join("\n"));
}

async function evaluateOne(options) {
  const input = path.resolve(String(options.input));
  const truthPath = path.resolve(String(options.truth));
  const identityTruthPath = path.resolve(String(options["identity-truth"]));
  const outputDir = path.resolve(String(options["output-dir"]));
  ensureDir(outputDir);
  const threshold = Number(options.threshold || 60);
  const weightsPath = path.resolve(String(options.weights || path.join(DEFAULT_OUTPUT_DIR, "learned-scoring-weights.json")));
  const scoringWeights = loadScoringWeights(weightsPath);
  const truth = readJson(truthPath, { fraud_order_ids: [], fraud_strategies: {}, expected_signals: {} });
  const identityTruth = readJson(identityTruthPath, { canonical_customers: [], expected_non_links: [] });

  const rows = [];
  const allAmounts = [];

  await streamCsv(input, (row) => {
    rows.push(row);
    allAmounts.push(Number(row.order_total || 0));
  });

  // Sort chronologically so each row is scored using only prior-order counts.
  rows.sort((a, b) => {
    const da = a.order_date ? new Date(a.order_date).getTime() : 0;
    const db = b.order_date ? new Date(b.order_date).getTime() : 0;
    return da - db;
  });

  allAmounts.sort((a, b) => a - b);
  const amountP90 = allAmounts[Math.floor(allAmounts.length * 0.9)] || 160;

  // Incremental point-in-time counts: each row sees only orders that preceded it.
  const runningEmail = new Map();
  const runningPhone = new Map();
  const runningAddress = new Map();
  const runningDevice = new Map();
  const runningPayment = new Map();
  const runningIp = new Map();
  // Velocity and rolling-window context maps.
  const lastOrderByEmail = new Map();        // email -> ISO date of most recent past order
  const rollingRefund90ByEmail = new Map();  // email -> count of refunds in the past 90 days
  const rollingClaim90ByEmail = new Map();   // email -> count of claims in the past 90 days
  // Stores timestamped refund/claim events per email for rolling window computation.
  const refundEventsByEmail = new Map();
  const claimEventsByEmail = new Map();

  const fraudSet = new Set(truth.fraud_order_ids || []);
  const predictions = [];
  const features = new Map();
  const signalTotals = {};
  for (const row of rows) {
    const email = normalizeEmail(row.customer_email);
    const orderTs = row.order_date ? new Date(row.order_date).getTime() : 0;
    const window90 = 90 * 86400 * 1000;

    // Compute rolling 90-day counts from stored events (all events precede this row).
    const refEvents = refundEventsByEmail.get(email) || [];
    const clEvents = claimEventsByEmail.get(email) || [];
    rollingRefund90ByEmail.set(email, refEvents.filter((t) => orderTs - t <= window90).length);
    rollingClaim90ByEmail.set(email, clEvents.filter((t) => orderTs - t <= window90).length);

    const context = {
      emailCounts: runningEmail,
      phoneCounts: runningPhone,
      addressCounts: runningAddress,
      deviceCounts: runningDevice,
      paymentCounts: runningPayment,
      ipCounts: runningIp,
      amountP90,
      lastOrderByEmail,
      rollingRefund90ByEmail,
      rollingClaim90ByEmail,
      reasons: [],
    };
    const result = rowSignals(row, context, scoringWeights);
    features.set(row.order_id, result);
    for (const [sig, points] of Object.entries(result.signals)) signalTotals[sig] = (signalTotals[sig] || 0) + points;
    predictions.push({
      order_id: row.order_id,
      customer_email: row.customer_email,
      risk_score: result.riskScore,
      predicted_label: result.riskScore >= threshold ? "fraud" : "legit",
      signals: Object.keys(result.signals).join("|"),
      reasons: context.reasons.join("|"),
    });

    // Register this row into counts AFTER scoring it (only past orders visible).
    const phone = result.phone;
    const address = result.address;
    runningEmail.set(email, (runningEmail.get(email) || 0) + 1);
    if (phone) runningPhone.set(phone, (runningPhone.get(phone) || 0) + 1);
    runningAddress.set(address, (runningAddress.get(address) || 0) + 1);
    if (row.device_id) runningDevice.set(row.device_id, (runningDevice.get(row.device_id) || 0) + 1);
    if (row.payment_fingerprint) runningPayment.set(row.payment_fingerprint, (runningPayment.get(row.payment_fingerprint) || 0) + 1);
    if (row.ip_address) runningIp.set(row.ip_address, (runningIp.get(row.ip_address) || 0) + 1);
    lastOrderByEmail.set(email, row.order_date || "");
    if (row.refund_status || row.refund_amount) {
      if (!refundEventsByEmail.has(email)) refundEventsByEmail.set(email, []);
      refundEventsByEmail.get(email).push(orderTs);
    }
    if (row.claim_status || row.claim_reason) {
      if (!claimEventsByEmail.has(email)) claimEventsByEmail.set(email, []);
      claimEventsByEmail.get(email).push(orderTs);
    }
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const predictionByOrder = new Map();
  for (const p of predictions) {
    const pred = p.risk_score >= threshold;
    predictionByOrder.set(p.order_id, pred);
    const actual = fraudSet.has(p.order_id);
    if (pred && actual) tp += 1;
    else if (pred && !actual) fp += 1;
    else if (!pred && actual) fn += 1;
    else tn += 1;
  }
  const metrics = precisionRecallF1(tp, fp, fn);
  const falsePositiveRate = fp + tn === 0 ? 0 : fp / (fp + tn);

  const rowsById = new Map(rows.map((r) => [r.order_id, r]));
  const missed = [];
  for (const orderId of fraudSet) {
    if (predictionByOrder.get(orderId)) continue;
    const strategy = truth.fraud_strategies?.[orderId]?.strategy || "unknown";
    const expected = truth.expected_signals?.[orderId] || [];
    const pred = predictions.find((p) => p.order_id === orderId);
    missed.push({
      order_id: orderId,
      canonical_customer_id: truth.fraud_strategies?.[orderId]?.canonical_customer_id || "",
      strategy,
      riskScore: pred ? pred.risk_score : 0,
      likely_missing_signals: expected.length ? expected : ["identity_linkage", "behavioural_history"],
    });
  }

  const falsePositives = predictions.filter((p) => p.risk_score >= threshold && !fraudSet.has(p.order_id)).slice(0, 80).map((p) => {
    const row = rowsById.get(p.order_id) || {};
    const why = [];
    if (row.business_account === "true") why.push("business/shared address");
    if (/student|room|unite/i.test(row.shipping_address || "")) why.push("student accommodation");
    if ((p.signals || "").includes("address_cluster")) why.push("address cluster overfit");
    if ((p.signals || "").includes("shared_device")) why.push("shared device overfit");
    if (!why.length) why.push("legitimate overlap or noisy records");
    return { ...p, why };
  });

  const patternMetrics = [];
  for (const strategy of FRAUD_STRATEGIES) {
    const truthOrders = Object.entries(truth.fraud_strategies || {}).filter(([, v]) => v.strategy === strategy).map(([id]) => id);
    const predictedStrategyOrders = predictions.filter((p) => p.risk_score >= threshold && truthOrders.includes(p.order_id));
    const strategyTp = predictedStrategyOrders.length;
    const strategyFn = Math.max(0, truthOrders.length - strategyTp);
    const strategyFp = predictions.filter((p) => p.risk_score >= threshold && !fraudSet.has(p.order_id) && (p.signals || "").includes(strategy.split("_")[0])).length;
    patternMetrics.push({
      strategy,
      truth: truthOrders.length,
      predicted: strategyTp,
      ...precisionRecallF1(strategyTp, strategyFp, strategyFn),
    });
  }

  const weakSignals = [];
  for (const p of patternMetrics) {
    if (p.truth > 0 && p.recall < 0.75) weakSignals.push(`${p.strategy}: recall ${p.recall}; generated cases are exploiting weak ${p.strategy.replace(/_/g, " ")} coverage.`);
  }
  if (falsePositiveRate > 0.05) weakSignals.push(`clean_baseline: false positive rate ${roundMetric(falsePositiveRate)} exceeds 0.05; over-merging or broad shared-signal rules likely need dampening.`);

  const identityPred = buildIdentityPredictions(rows, features);
  const identity = evaluateIdentity(identityTruth, identityPred);

  const outputPrefix = path.basename(input).replace(/\.csv$/i, "");
  const predPath = path.join(outputDir, `${outputPrefix}_predictions.csv`);
  const predStream = fs.createWriteStream(predPath);
  const predCols = ["order_id", "customer_email", "risk_score", "predicted_label", "signals", "reasons"];
  predStream.write(predCols.join(",") + "\n");
  for (const p of predictions) predStream.write(csvRow(predCols, p));
  await new Promise((resolve, reject) => {
    predStream.end(resolve);
    predStream.on("error", reject);
  });

  const summary = {
    input,
    truth: truthPath,
    identity_truth: identityTruthPath,
    orders: rows.length,
    threshold,
    weights: weightsPath,
    scoring_weights: scoringWeights,
    true_positives: tp,
    false_positives: fp,
    false_negatives: fn,
    true_negatives: tn,
    fraud_prevalence: rows.length ? fraudSet.size / rows.length : 0,
    false_positive_rate: roundMetric(falsePositiveRate),
    ...metrics,
    pattern_metrics: patternMetrics,
    identity_metrics: {
      precision: identity.precision,
      recall: identity.recall,
      merge_accuracy: identity.merge_accuracy,
      false_merges: identity.false_merges.length,
      missed_links: identity.missed_links.length,
      expected_non_link_errors: identity.expected_non_link_errors,
    },
    weak_signals: weakSignals,
    predictions: predPath,
  };

  writeJson(path.join(outputDir, `${outputPrefix}_eval-summary.json`), summary);
  writeEvalReport(path.join(outputDir, outputPrefix === "merchant_dataset" ? "eval-report.md" : `${outputPrefix}_eval-report.md`), summary, missed, falsePositives, weakSignals, patternMetrics);
  writeIdentityReport(path.join(outputDir, outputPrefix === "merchant_dataset" ? "identity-report.md" : `${outputPrefix}_identity-report.md`), summary, identity);
  writeSchemaOpportunities(path.join(outputDir, outputPrefix === "merchant_dataset" ? "schema-opportunities.md" : `${outputPrefix}_schema-opportunities.md`), Object.keys(rows[0] || {}));

  return summary;
}

async function evaluateAll(options) {
  const input = path.resolve(String(options.input));
  const outputDir = path.resolve(String(options["output-dir"]));
  const tierOne = path.join(outputDir, "merchant_dataset_tier1.csv");
  const usingDefaultInput = input === path.resolve(defaultOptions.input);
  if (fs.existsSync(input) && !(usingDefaultInput && fs.existsSync(tierOne))) return [await evaluateOne(options)];
  const summaries = [];
  for (const tier of [1, 2, 3]) {
    const tierInput = path.join(outputDir, `merchant_dataset_tier${tier}.csv`);
    if (!fs.existsSync(tierInput)) continue;
    summaries.push(await evaluateOne({
      ...options,
      input: tierInput,
      truth: path.join(outputDir, `merchant_truth_tier${tier}.json`),
      "identity-truth": path.join(outputDir, `identity_truth_tier${tier}.json`),
    }));
  }
  if (!summaries.length) throw new Error(`No dataset found at ${input} or tiered merchant_dataset_tier*.csv files in ${outputDir}`);
  if (summaries.length > 1) {
    const lines = [];
    lines.push("# ParcelClaim Synthetic Evaluation Report");
    lines.push("");
    lines.push("Multi-tier evaluation summary. Tier-specific reports are written next to each tiered dataset.");
    lines.push("");
    lines.push("| tier | precision | recall | F1 | clean FPR | identity precision | identity recall |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const summary of summaries) {
      const tier = summary.input.match(/tier(\d)/)?.[1] || "single";
      lines.push(`| ${tier} | ${summary.precision} | ${summary.recall} | ${summary.f1} | ${summary.false_positive_rate} | ${summary.identity_metrics.precision} | ${summary.identity_metrics.recall} |`);
    }
    fs.writeFileSync(path.join(outputDir, "eval-report.md"), lines.join("\n"));
    const identityLines = [];
    identityLines.push("# ParcelClaim Identity Resolution Report");
    identityLines.push("");
    identityLines.push("Multi-tier identity summary. Tier-specific identity reports contain missed-link and false-merge examples.");
    identityLines.push("");
    identityLines.push("| tier | identity precision | identity recall | merge accuracy | false merges | missed links |");
    identityLines.push("| --- | --- | --- | --- | --- | --- |");
    for (const summary of summaries) {
      const tier = summary.input.match(/tier(\d)/)?.[1] || "single";
      identityLines.push(`| ${tier} | ${summary.identity_metrics.precision} | ${summary.identity_metrics.recall} | ${summary.identity_metrics.merge_accuracy} | ${summary.identity_metrics.false_merges} | ${summary.identity_metrics.missed_links} |`);
    }
    fs.writeFileSync(path.join(outputDir, "identity-report.md"), identityLines.join("\n"));
    writeSchemaOpportunities(path.join(outputDir, "schema-opportunities.md"), []);
  }
  return summaries;
}

async function main() {
  const options = parseArgs(defaultOptions);
  const summaries = await evaluateAll(options);
  console.log(JSON.stringify({ ok: true, summaries }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { evaluateOne, evaluateAll, rowSignals, buildIdentityPredictions };
