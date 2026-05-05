const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  DEFAULT_OUTPUT_DIR,
  parseArgs,
  ensureDir,
  writeJson,
  readJson,
  normalizeScoringWeights,
  loadScoringWeights,
  writeScoringWeights,
  SCORING_WEIGHT_LIMITS,
  SCORING_WEIGHT_CAPS,
  formatPct,
  roundMetric,
} = require("./common.ts");

const defaultOptions = {
  orders: 100000,
  customers: 20000,
  "fraud-rate": 0.04,
  iterations: 20,
  seed: 42,
  threshold: 60,
  "output-dir": DEFAULT_OUTPUT_DIR,
  weights: path.join(DEFAULT_OUTPUT_DIR, "learned-scoring-weights.json"),
  "learning-rate": 0.18,
  "max-fpr": 0.05,
  "calibrate-threshold": false,
  compact: false,
  tiers: "1,2,3",
};

const TARGETS = {
  clean_baseline_false_positive_rate: 0.05,
  refund_abusers_f1: 0.80,
  inr_recall: 0.90,
  address_cluster_recall: 0.95,
  mixed_realistic_f1: 0.75,
};

function runNode(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${path.basename(script)} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

function arg(name, value) {
  return `--${name}=${value}`;
}

function pattern(summary, strategy) {
  return (summary.pattern_metrics || []).find((p) => p.strategy === strategy) || { precision: 0, recall: 0, f1: 0, truth: 0, predicted: 0 };
}

function assessTier(summary) {
  return {
    clean_baseline_false_positive_rate: Number(summary.false_positive_rate || 0),
    refund_abusers_f1: Number(pattern(summary, "serial_refund_abuse").f1 || 0),
    inr_recall: Number(pattern(summary, "inr_fraud").recall || 0),
    address_cluster_recall: Number(pattern(summary, "address_cluster").recall || 0),
    mixed_realistic_f1: Number(pattern(summary, "mixed_borderline").f1 || 0),
    fraud_f1: Number(summary.f1 || 0),
    fraud_precision: Number(summary.precision || 0),
    fraud_recall: Number(summary.recall || 0),
    identity_precision: Number(summary.identity_metrics?.precision || 0),
    identity_recall: Number(summary.identity_metrics?.recall || 0),
    identity_merge_accuracy: Number(summary.identity_metrics?.merge_accuracy || 0),
  };
}

function targetPass(metrics) {
  return (
    metrics.clean_baseline_false_positive_rate < TARGETS.clean_baseline_false_positive_rate &&
    metrics.refund_abusers_f1 > TARGETS.refund_abusers_f1 &&
    metrics.inr_recall > TARGETS.inr_recall &&
    metrics.address_cluster_recall > TARGETS.address_cluster_recall &&
    metrics.mixed_realistic_f1 > TARGETS.mixed_realistic_f1
  );
}

function chooseFocus(summaries) {
  const deficits = [];
  for (const summary of summaries) {
    const m = assessTier(summary);
    deficits.push(["serial_refund_abuse", TARGETS.refund_abusers_f1 - m.refund_abusers_f1]);
    deficits.push(["inr_fraud", TARGETS.inr_recall - m.inr_recall]);
    deficits.push(["address_cluster", TARGETS.address_cluster_recall - m.address_cluster_recall]);
    deficits.push(["mixed_borderline", TARGETS.mixed_realistic_f1 - m.mixed_realistic_f1]);
    deficits.push(["false_positive_guards", m.clean_baseline_false_positive_rate - TARGETS.clean_baseline_false_positive_rate]);
    if (m.identity_recall < 0.9) deficits.push(["identity_mutations", 0.9 - m.identity_recall]);
    if (m.identity_precision < 0.95) deficits.push(["legitimate_overlap", 0.95 - m.identity_precision]);
  }
  deficits.sort((a, b) => b[1] - a[1]);
  return deficits.filter(([, d]) => d > 0).slice(0, 3).map(([name]) => {
    if (name === "identity_mutations") return "plus_alias_abuse";
    if (name === "legitimate_overlap") return "address_cluster";
    if (name === "false_positive_guards") return "mixed_borderline";
    return name;
  });
}

const STRATEGY_SIGNALS = {
  serial_refund_abuse: ["claim_rate", "refund_rate", "full_refund", "email_reuse", "first_order_claim"],
  inr_fraud: ["inr_timing", "high_value_claim", "billing_shipping_mismatch", "geo_mismatch"],
  address_cluster: ["address_cluster", "cluster_claim_corroboration", "phone_reuse", "email_reuse"],
  plus_alias_abuse: ["plus_alias", "email_reuse", "cluster_claim_corroboration"],
  disposable_email_abuse: ["disposable_email", "young_account", "ip_risk"],
  payment_churn: ["payment_churn", "shared_payment", "billing_shipping_mismatch"],
  cross_merchant_overlap: ["shared_payment", "shared_device", "ip_velocity", "email_reuse"],
  velocity_attack: ["ip_velocity", "fast_checkout", "shared_device", "young_account", "order_velocity"],
  mixed_borderline: ["cluster_claim_corroboration", "inr_timing", "refund_rate", "high_value_claim"],
};

const BROAD_OVERLAP_SIGNALS = ["address_cluster", "shared_device", "shared_payment", "ip_velocity", "phone_reuse"];
const CLEAN_GUARDS = ["business_address_guard", "student_address_guard", "cancelled_order_guard"];
const SAFETY_DAMPEN_SIGNALS = [
  "email_reuse",
  "cluster_claim_corroboration",
  "address_cluster",
  "shared_device",
  "shared_payment",
  "ip_velocity",
  "phone_reuse",
];

function adjust(weights, signal, delta, changes, reason) {
  const before = Number(weights[signal] ?? 1);
  const max = SCORING_WEIGHT_CAPS[signal] || SCORING_WEIGHT_LIMITS.max;
  const after = roundMetric(Math.max(SCORING_WEIGHT_LIMITS.min, Math.min(max, before + delta)));
  if (after === before) return;
  weights[signal] = after;
  changes.push({ signal, before, after, delta: roundMetric(after - before), reason });
}

function learnWeights(weights, summaries, learningRate, maxFpr) {
  const next = normalizeScoringWeights(weights);
  const changes = [];
  const worstFpr = Math.max(...summaries.map((summary) => Number(summary.false_positive_rate || 0)));
  const safetyMode = worstFpr > maxFpr;

  if (safetyMode) {
    const excess = worstFpr - maxFpr;
    const dampen = -Math.min(0.45, 0.08 + learningRate * excess * 4);
    const guardBoost = Math.min(0.35, 0.05 + learningRate * excess * 3);
    for (const signal of SAFETY_DAMPEN_SIGNALS) adjust(next, signal, dampen, changes, `safety mode FPR ${roundMetric(worstFpr)}`);
    for (const signal of CLEAN_GUARDS) adjust(next, signal, guardBoost, changes, `safety mode FPR ${roundMetric(worstFpr)}`);
    return { weights: normalizeScoringWeights(next), changes, safetyMode };
  }

  for (const summary of summaries) {
    const summaryFpr = Number(summary.false_positive_rate || 0);
    for (const metric of summary.pattern_metrics || []) {
      const signals = STRATEGY_SIGNALS[metric.strategy] || [];
      if (!signals.length || !metric.truth) continue;

      const usesBroadOverlap = signals.some((signal) => BROAD_OVERLAP_SIGNALS.includes(signal));
      const canChaseRecall = Number(metric.predicted || 0) === 0 || Number(metric.precision || 0) >= 0.35;
      if (metric.recall < 0.75 && canChaseRecall && !(summaryFpr > TARGETS.clean_baseline_false_positive_rate && usesBroadOverlap)) {
        const deficit = 0.75 - Number(metric.recall || 0);
        const delta = Math.min(0.22, learningRate * deficit);
        for (const signal of signals) adjust(next, signal, delta, changes, `${metric.strategy} recall ${metric.recall}`);
      }

      const shouldDampenPattern = true;
      if (shouldDampenPattern && metric.precision > 0 && metric.precision < 0.35) {
        const excess = 0.35 - Number(metric.precision || 0);
        const delta = -Math.min(0.14, learningRate * excess);
        for (const signal of signals) adjust(next, signal, delta, changes, `${metric.strategy} precision ${metric.precision}`);
      }
    }

    const fpr = summaryFpr;
    if (fpr > TARGETS.clean_baseline_false_positive_rate) {
      const excess = fpr - TARGETS.clean_baseline_false_positive_rate;
      const dampen = -Math.min(0.3, learningRate * excess * 4);
      const guardBoost = Math.min(0.25, learningRate * excess * 3);
      for (const signal of BROAD_OVERLAP_SIGNALS) adjust(next, signal, dampen, changes, `clean FPR ${summary.false_positive_rate}`);
      for (const signal of CLEAN_GUARDS) adjust(next, signal, guardBoost, changes, `clean FPR ${summary.false_positive_rate}`);
    }

    const identityPrecision = Number(summary.identity_metrics?.precision || 0);
    if (identityPrecision < 0.9) {
      const delta = -Math.min(0.12, learningRate * (0.9 - identityPrecision));
      for (const signal of BROAD_OVERLAP_SIGNALS) adjust(next, signal, delta, changes, `identity precision ${identityPrecision}`);
      for (const signal of CLEAN_GUARDS) adjust(next, signal, Math.abs(delta), changes, `identity precision ${identityPrecision}`);
    }
  }

  return { weights: normalizeScoringWeights(next), changes, safetyMode };
}

function loadPredictionRows(summary) {
  const truth = readJson(summary.truth, {});
  const fraudIds = new Set(truth.fraud_order_ids || []);
  if (!summary.predictions || !fs.existsSync(summary.predictions)) return [];
  const lines = fs.readFileSync(summary.predictions, "utf8").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const orderIdx = headers.indexOf("order_id");
  const scoreIdx = headers.indexOf("risk_score");
  if (orderIdx < 0 || scoreIdx < 0) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const orderId = cols[orderIdx];
    return {
      score: Number(cols[scoreIdx] || 0),
      fraud: fraudIds.has(orderId),
    };
  });
}

function scoreAtThreshold(rows, threshold) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const row of rows) {
    const predicted = row.score >= threshold;
    if (predicted && row.fraud) tp += 1;
    else if (predicted && !row.fraud) fp += 1;
    else if (!predicted && row.fraud) fn += 1;
    else tn += 1;
  }
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = (2 * precision * recall) / (precision + recall) || 0;
  const fpr = fp / (fp + tn) || 0;
  return { threshold, precision, recall, f1, fpr, tp, fp, fn, tn };
}

function calibrateThreshold(summaries, maxFpr, currentThreshold) {
  const tierRows = summaries.map(loadPredictionRows).filter((rows) => rows.length);
  if (!tierRows.length) return { threshold: currentThreshold, changed: false };
  let best = null;
  for (let threshold = 20; threshold <= 100; threshold += 1) {
    const tierMetrics = tierRows.map((rows) => scoreAtThreshold(rows, threshold));
    const worstFpr = Math.max(...tierMetrics.map((metrics) => metrics.fpr));
    if (worstFpr > maxFpr) continue;
    const worstF1 = Math.min(...tierMetrics.map((metrics) => metrics.f1));
    const worstPrecision = Math.min(...tierMetrics.map((metrics) => metrics.precision));
    const worstRecall = Math.min(...tierMetrics.map((metrics) => metrics.recall));
    const metrics = {
      threshold,
      f1: worstF1,
      precision: worstPrecision,
      recall: worstRecall,
      fpr: worstFpr,
    };
    if (
      !best ||
      metrics.f1 > best.f1 ||
      (metrics.f1 === best.f1 && Math.abs(threshold - currentThreshold) < Math.abs(best.threshold - currentThreshold))
    ) {
      best = metrics;
    }
  }
  if (!best) return { threshold: Math.min(100, currentThreshold + 5), changed: true };
  return {
    ...best,
    threshold: Math.max(20, Math.min(100, best.threshold)),
    changed: best.threshold !== currentThreshold,
  };
}

function removeIfExists(file) {
  fs.rmSync(file, { force: true, recursive: true });
}

function compactIteration(iterDir, root) {
  for (const file of [
    "merchant_dataset.csv",
    "merchant_truth.json",
    "identity_truth.json",
  ]) {
    removeIfExists(path.join(root, file));
  }

  for (const tierDir of fs.readdirSync(iterDir).filter((name) => /^tier\d+$/.test(name))) {
    const dir = path.join(iterDir, tierDir);
    for (const file of fs.readdirSync(dir)) {
      if (
        file.endsWith(".csv") ||
        file.endsWith("_truth.json") ||
        file.endsWith("_predictions.csv")
      ) {
        removeIfExists(path.join(dir, file));
      }
    }
  }
}

function writeIterationReport(file, iterationSummaries, aggregate, focus, passed, consecutivePasses) {
  const lines = [];
  lines.push(`# Synthetic Lab Iteration ${aggregate.iteration}`);
  lines.push("");
  lines.push(`Hardness: ${aggregate.hardness}`);
  lines.push(`Next focus: ${focus.length ? focus.join(", ") : "balanced"}`);
  lines.push(`Target pass this iteration: ${passed ? "yes" : "no"}`);
  lines.push(`Consecutive passes: ${consecutivePasses}`);
  lines.push("");
  lines.push(`## Tier Metrics`);
  lines.push("| tier | fraud precision | fraud recall | fraud F1 | clean FPR | refund F1 | INR recall | address recall | mixed F1 | identity precision | identity recall |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const summary of iterationSummaries) {
    const m = assessTier(summary);
    lines.push(`| ${summary.input.match(/tier(\d)/)?.[1] || "single"} | ${m.fraud_precision} | ${m.fraud_recall} | ${m.fraud_f1} | ${m.clean_baseline_false_positive_rate} | ${m.refund_abusers_f1} | ${m.inr_recall} | ${m.address_cluster_recall} | ${m.mixed_realistic_f1} | ${m.identity_precision} | ${m.identity_recall} |`);
  }
  lines.push("");
  lines.push(`## Targets`);
  lines.push(`- Clean baseline false positive rate < ${formatPct(TARGETS.clean_baseline_false_positive_rate)}`);
  lines.push(`- Refund abusers F1 > ${TARGETS.refund_abusers_f1}`);
  lines.push(`- INR recall > ${TARGETS.inr_recall}`);
  lines.push(`- Address cluster recall > ${TARGETS.address_cluster_recall}`);
  lines.push(`- Mixed realistic F1 > ${TARGETS.mixed_realistic_f1}`);
  lines.push("");
  lines.push(`## Weight Changes`);
  if (aggregate.weight_changes?.length) {
    lines.push("| signal | before | after | reason |");
    lines.push("| --- | --- | --- | --- |");
    for (const change of aggregate.weight_changes.slice(0, 40)) {
      lines.push(`| ${change.signal} | ${change.before} | ${change.after} | ${change.reason} |`);
    }
  } else {
    lines.push("_No weight changes proposed this iteration._");
  }
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join("\n"));
}

// Derive per-tier weights file path from the shared weights base path.
function tierWeightsPath(base, tier) {
  const ext = base.endsWith(".json") ? base.slice(0, -5) : base;
  return `${ext}-tier${tier}.json`;
}

async function main() {
  const options = parseArgs(defaultOptions);
  const root = path.resolve(String(options["output-dir"]));
  const iterationsDir = path.join(root, "iterations");
  ensureDir(iterationsDir);
  const scriptDir = __dirname;
  const cwd = path.resolve(scriptDir, "..");
  const sharedWeightsBase = path.resolve(String(options.weights || path.join(root, "learned-scoring-weights.json")));
  const tiers = String(options.tiers || "1,2,3").split(",").map((n) => Number(n.trim())).filter(Boolean);
  const doCalibrate = options["calibrate-threshold"] === true || options["calibrate-threshold"] === "true";

  // Per-tier state: weights and threshold, seeded from shared weights if no tier file exists yet.
  const tierWeights = {};
  const tierThresholds = {};
  for (const tier of tiers) {
    const tp = tierWeightsPath(sharedWeightsBase, tier);
    tierWeights[tier] = loadScoringWeights(fs.existsSync(tp) ? tp : sharedWeightsBase);
    tierThresholds[tier] = Number(options.threshold || 60);
  }

  let hardness = Number(options.hardness || 0);
  let focus = String(options.focus || "").split(",").map((s) => s.trim()).filter(Boolean);
  let consecutivePasses = 0;
  const runSummary = [];

  for (let iteration = 1; iteration <= Number(options.iterations); iteration += 1) {
    const iterDir = path.join(iterationsDir, `iter_${String(iteration).padStart(2, "0")}`);
    ensureDir(iterDir);
    console.log(`[synthetic-lab] iteration ${iteration}: hardness=${hardness}, focus=${focus.join(",") || "balanced"}`);

    const trainSummaries = [];
    const valSummaries = [];

    for (const tier of tiers) {
      const tierDir = path.join(iterDir, `tier${tier}`);
      ensureDir(tierDir);
      const iterTierWeightsPath = path.join(iterDir, `scoring-weights-tier${tier}.json`);
      writeScoringWeights(iterTierWeightsPath, tierWeights[tier], { source: sharedWeightsBase, iteration, tier });

      // --- Train dataset ---
      runNode(path.join(scriptDir, "generate.ts"), [
        arg("orders", options.orders),
        arg("customers", options.customers),
        arg("fraud-rate", options["fraud-rate"]),
        arg("seed", `${options.seed}-${iteration}-${tier}`),
        arg("tier", tier),
        arg("hardness", hardness),
        arg("focus", focus.join(",")),
        arg("output-dir", tierDir),
        arg("prefix", "merchant_dataset"),
      ], cwd);

      runNode(path.join(scriptDir, "evaluate.ts"), [
        arg("input", path.join(tierDir, "merchant_dataset.csv")),
        arg("truth", path.join(tierDir, "merchant_truth.json")),
        arg("identity-truth", path.join(tierDir, "identity_truth.json")),
        arg("output-dir", tierDir),
        arg("threshold", tierThresholds[tier]),
        arg("weights", iterTierWeightsPath),
      ], cwd);

      const trainSummaryPath = path.join(tierDir, "merchant_dataset_eval-summary.json");
      const trainSummary = readJson(trainSummaryPath);
      trainSummaries.push(trainSummary);

      // --- Validation dataset (separate seed) used only for threshold calibration ---
      if (doCalibrate) {
        const valDir = path.join(iterDir, `tier${tier}_val`);
        ensureDir(valDir);
        runNode(path.join(scriptDir, "generate.ts"), [
          arg("orders", options.orders),
          arg("customers", options.customers),
          arg("fraud-rate", options["fraud-rate"]),
          arg("seed", `${options.seed}-${iteration}-${tier}-val`),
          arg("tier", tier),
          arg("hardness", hardness),
          arg("focus", focus.join(",")),
          arg("output-dir", valDir),
          arg("prefix", "merchant_dataset"),
        ], cwd);

        runNode(path.join(scriptDir, "evaluate.ts"), [
          arg("input", path.join(valDir, "merchant_dataset.csv")),
          arg("truth", path.join(valDir, "merchant_truth.json")),
          arg("identity-truth", path.join(valDir, "identity_truth.json")),
          arg("output-dir", valDir),
          arg("threshold", tierThresholds[tier]),
          arg("weights", iterTierWeightsPath),
        ], cwd);

        valSummaries.push(readJson(path.join(valDir, "merchant_dataset_eval-summary.json")));
      }
    }

    const worst = trainSummaries.map(assessTier).reduce((acc, m) => ({
      clean_baseline_false_positive_rate: Math.max(acc.clean_baseline_false_positive_rate, m.clean_baseline_false_positive_rate),
      refund_abusers_f1: Math.min(acc.refund_abusers_f1, m.refund_abusers_f1),
      inr_recall: Math.min(acc.inr_recall, m.inr_recall),
      address_cluster_recall: Math.min(acc.address_cluster_recall, m.address_cluster_recall),
      mixed_realistic_f1: Math.min(acc.mixed_realistic_f1, m.mixed_realistic_f1),
      fraud_f1: Math.min(acc.fraud_f1, m.fraud_f1),
      fraud_precision: Math.min(acc.fraud_precision, m.fraud_precision),
      fraud_recall: Math.min(acc.fraud_recall, m.fraud_recall),
      identity_precision: Math.min(acc.identity_precision, m.identity_precision),
      identity_recall: Math.min(acc.identity_recall, m.identity_recall),
    }), {
      clean_baseline_false_positive_rate: 0,
      refund_abusers_f1: 1,
      inr_recall: 1,
      address_cluster_recall: 1,
      mixed_realistic_f1: 1,
      fraud_f1: 1,
      fraud_precision: 1,
      fraud_recall: 1,
      identity_precision: 1,
      identity_recall: 1,
    });

    const passed = targetPass(worst);
    consecutivePasses = passed ? consecutivePasses + 1 : 0;
    focus = chooseFocus(trainSummaries);

    // Learn weights independently per tier; accumulate all changes for logging.
    const allChanges = [];
    let anySafetyMode = false;
    for (let i = 0; i < tiers.length; i += 1) {
      const tier = tiers[i];
      const tierSummaries = [trainSummaries[i]];
      const learned = learnWeights(
        tierWeights[tier],
        tierSummaries,
        Number(options["learning-rate"] || 0.18),
        Number(options["max-fpr"] || TARGETS.clean_baseline_false_positive_rate)
      );
      tierWeights[tier] = learned.weights;
      if (learned.safetyMode) anySafetyMode = true;
      for (const c of learned.changes) allChanges.push({ ...c, tier });

      // Calibrate threshold on val set (separate seed → no overfit).
      const calibSummaries = doCalibrate && valSummaries[i] ? [valSummaries[i]] : null;
      const threshCalib = calibSummaries
        ? calibrateThreshold(calibSummaries, Number(options["max-fpr"] || TARGETS.clean_baseline_false_positive_rate), tierThresholds[tier])
        : { threshold: tierThresholds[tier], changed: false };
      if (threshCalib.changed) {
        console.log(`[synthetic-lab] iter ${iteration} tier${tier} threshold: ${tierThresholds[tier]}->${threshCalib.threshold} (F1=${roundMetric(threshCalib.f1 || 0)}, FPR=${roundMetric(threshCalib.fpr || 0)})`);
        tierThresholds[tier] = threshCalib.threshold;
      }

      // Write per-tier learned weights.
      writeScoringWeights(tierWeightsPath(sharedWeightsBase, tier), tierWeights[tier], {
        source: sharedWeightsBase, iteration, tier, changes: learned.changes,
      });
    }

    // Write a combined shared weights file as the average of per-tier weights
    // (used as fallback and for the loop's --weights arg on the next outer round).
    const sharedWeights = normalizeScoringWeights(
      Object.fromEntries(
        Object.keys(tierWeights[tiers[0]]).map((sig) => [
          sig,
          tiers.reduce((sum, t) => sum + Number(tierWeights[t][sig] || 1), 0) / tiers.length,
        ])
      )
    );
    writeScoringWeights(sharedWeightsBase, sharedWeights, { iteration, source: "averaged_per_tier" });

    const aggregate = {
      iteration,
      hardness,
      thresholds: Object.fromEntries(tiers.map((t) => [`tier${t}`, tierThresholds[t]])),
      passed,
      consecutive_passes: consecutivePasses,
      worst_case_metrics: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, roundMetric(v)])),
      next_focus: focus,
      safety_mode: anySafetyMode,
      weight_changes: allChanges.slice(0, 80),
    };
    runSummary.push(aggregate);
    writeJson(path.join(iterDir, "iteration-summary.json"), { aggregate, summaries: trainSummaries });
    writeIterationReport(path.join(iterDir, "iteration-report.md"), trainSummaries, aggregate, focus, passed, consecutivePasses);

    const refTier = tiers.includes(2) ? 2 : tiers[0];
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "merchant_dataset.csv"), path.join(root, "merchant_dataset.csv"));
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "merchant_truth.json"), path.join(root, "merchant_truth.json"));
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "identity_truth.json"), path.join(root, "identity_truth.json"));
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "eval-report.md"), path.join(root, "eval-report.md"));
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "identity-report.md"), path.join(root, "identity-report.md"));
    fs.copyFileSync(path.join(iterDir, `tier${refTier}`, "schema-opportunities.md"), path.join(root, "schema-opportunities.md"));
    if (options.compact === true || options.compact === "true") compactIteration(iterDir, root);

    console.log(`[synthetic-lab] iteration ${iteration} worst-case: F1=${worst.fraud_f1}, FPR=${worst.clean_baseline_false_positive_rate}, identity=${worst.identity_precision}/${worst.identity_recall}`);
    if (anySafetyMode) console.log(`[synthetic-lab] iteration ${iteration} safety mode active on at least one tier.`);
    if (allChanges.length) {
      const preview = allChanges.slice(0, 4).map((c) => `tier${c.tier}:${c.signal}:${c.before}->${c.after}`).join(", ");
      console.log(`[synthetic-lab] iteration ${iteration} learned weights: ${preview}${allChanges.length > 4 ? ", ..." : ""}`);
    }
    if (consecutivePasses >= 2) {
      console.log("[synthetic-lab] targets met for two consecutive iterations; stopping.");
      break;
    }
    hardness += 1;
  }

  writeJson(path.join(root, "iterate-summary.json"), {
    generated_at: new Date().toISOString(),
    options,
    targets: TARGETS,
    learned_weights: sharedWeightsBase,
    final_tier_thresholds: Object.fromEntries(tiers.map((t) => [`tier${t}`, tierThresholds[t]])),
    final_scoring_weights: Object.fromEntries(tiers.map((t) => [`tier${t}`, tierWeights[t]])),
    iterations: runSummary,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
