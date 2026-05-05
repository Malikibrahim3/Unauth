#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_FPR="${TARGET_FPR:-0.05}"
TARGET_F1="${TARGET_F1:-0.70}"
TARGET_ID_PREC="${TARGET_ID_PREC:-0.95}"
TARGET_ID_RECALL="${TARGET_ID_RECALL:-0.99}"
CONSECUTIVE_REQUIRED="${CONSECUTIVE_REQUIRED:-2}"

ORDERS="${ORDERS:-18000}"
CUSTOMERS="${CUSTOMERS:-5000}"
ITERATIONS="${ITERATIONS:-5}"
SEEDS="${SEEDS:-42 99 123 777 2026 31415}"
WEIGHTS_FILE="${WEIGHTS_FILE:-synthetic-lab/outputs/merchant-readiness-weights.json}"
# Threshold is now calibrated per-tier inside iterate.ts; initial value only used for the first run.
THRESHOLD="${THRESHOLD:-40}"
# Set CALIBRATE_THRESHOLD=true to enable per-tier threshold calibration on a held-out val set.
CALIBRATE_THRESHOLD="${CALIBRATE_THRESHOLD:-true}"

consecutive=0
round=0

cleanup_outputs() {
  find synthetic-lab/outputs -maxdepth 1 -type d -name "auto-round-*" -exec rm -rf {} +
  mkdir -p synthetic-lab/outputs
}

while true; do
  round=$((round + 1))
  echo ""
  echo "========== ROUND $round =========="
  cleanup_outputs
  echo "[learn] persistent weights=$WEIGHTS_FILE (per-tier: ${WEIGHTS_FILE%.json}-tier{1,2,3}.json)"

  all_pass=1

  for seed in $SEEDS; do
    outdir="synthetic-lab/outputs/auto-round-${round}-seed-${seed}"
    rm -rf "$outdir"
    echo "[run] seed=$seed outdir=$outdir"

    npm run synthetic:iterate -- \
      --orders="$ORDERS" \
      --customers="$CUSTOMERS" \
      --iterations="$ITERATIONS" \
      --tiers=1,2,3 \
      --threshold="$THRESHOLD" \
      --seed="$seed" \
      --compact=true \
      --max-fpr="$TARGET_FPR" \
      --output-dir="$outdir" \
      --weights="$WEIGHTS_FILE" \
      --calibrate-threshold="$CALIBRATE_THRESHOLD"

    summary="$outdir/iterate-summary.json"
    read -r f1 fpr ip ir < <(node -e '
      const fs = require("fs");
      const summary = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const metrics = summary.iterations[summary.iterations.length - 1].worst_case_metrics;
      console.log([
        metrics.fraud_f1,
        metrics.clean_baseline_false_positive_rate,
        metrics.identity_precision,
        metrics.identity_recall,
      ].join(" "));
    ' "$summary")

    echo "[metrics] seed=$seed f1=$f1 fpr=$fpr id_prec=$ip id_rec=$ir"

    pass=$(node -e '
      const [f1, fpr, ip, ir, targetF1, targetFpr, targetIp, targetIr] = process.argv.slice(1).map(Number);
      const ok = f1 >= targetF1 && fpr <= targetFpr && ip >= targetIp && ir >= targetIr;
      process.stdout.write(ok ? "1" : "0");
    ' "$f1" "$fpr" "$ip" "$ir" "$TARGET_F1" "$TARGET_FPR" "$TARGET_ID_PREC" "$TARGET_ID_RECALL")

    if [[ "$pass" != "1" ]]; then
      all_pass=0
    fi
  done

  if [[ "$all_pass" == "1" ]]; then
    consecutive=$((consecutive + 1))
    echo "[status] pass round ($consecutive/$CONSECUTIVE_REQUIRED)"
  else
    consecutive=0
    echo "[status] targets not stable yet"
  fi

  if [[ "$consecutive" -ge "$CONSECUTIVE_REQUIRED" ]]; then
    echo "STOPPING: merchant-grade targets met."
    exit 0
  fi
done
