#!/usr/bin/env node
/**
 * dashboard.mjs — live monitor for the tuning pipeline
 * Run: node scripts/tune/dashboard.mjs
 * Refreshes every 2s. Press Ctrl+C to quit (pipeline keeps running).
 */

import fs   from 'fs';
import { execSync } from 'child_process';

const LOG_FILE        = '/tmp/tune.log';
const CHECKPOINT_FILE = 'test-data/tune/checkpoint.json';
const REPORT_FILE     = 'test-data/tune/report.json';
const REFRESH_MS      = 2000;

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC   = '\x1b[';
const RESET = '\x1b[0m';
const CLEAR = '\x1b[2J\x1b[H';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const YELLOW= '\x1b[33m';
const WHITE = '\x1b[97m';

function bar(value, max, width = 30, color = GREEN) {
  const filled = Math.round((value / max) * width);
  const empty  = width - filled;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(empty) + RESET;
}

// ── Parse log file ────────────────────────────────────────────────────────────
function parseLog(content) {
  const lines = content.trim().split('\n');
  const state = {
    phase:        'starting',
    phase3Done:   false,
    phase4Done:   false,
    phase5Done:   false,
    done:         false,
    baseline:     null,   // { f1, p, r }
    currentIter:  0,
    maxIter:      120,
    bestF1:       0,
    plateau:      0,
    lastAction:   '',
    lastAccepted: null,
    iters:        [],     // [{ iter, param, prev, next, f1Before, f1After, accepted, elapsed }]
    currentDataset: null, // { name, n, total }
    recentLines:  [],
    startTime:    null,
    stopReason:   null,
  };

  for (const line of lines) {
    // Timestamp extraction
    const tsMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]/);
    if (tsMatch && !state.startTime) state.startTime = tsMatch[1];
    const lastTs = tsMatch ? tsMatch[1] : state.lastTs;
    state.lastTs = lastTs;

    if (line.includes('Phase 3')) { state.phase = 'phase3'; }
    if (line.includes('Phase 4')) { state.phase = 'phase4'; }
    if (line.includes('Phase 5')) { state.phase = 'phase5'; }
    if (line.includes('Phase 6')) { state.phase = 'phase6'; }
    if (line.includes('Tuning run complete')) { state.phase = 'done'; state.done = true; }

    // Baseline
    const baseMatch = line.match(/Baseline.*?F1=([\d.]+)%.*?P=([\d.]+)%.*?R=([\d.]+)%/);
    if (baseMatch) {
      state.baseline = { f1: +baseMatch[1], p: +baseMatch[2], r: +baseMatch[3] };
      state.phase3Done = true;
    }

    // Iter header
    const iterHeaderMatch = line.match(/--- Iter (\d+)\/(\d+).*?bestF1=([\d.]+)%.*?plateau=(\d+)\/(\d+)/);
    if (iterHeaderMatch) {
      state.currentIter  = +iterHeaderMatch[1];
      state.maxIter      = +iterHeaderMatch[2];
      state.bestF1       = +iterHeaderMatch[3];
      state.plateau      = +iterHeaderMatch[4];
    }

    // Iter result
    const iterResult = line.match(/\[Iter (\d+)\] (\S+): (\d+)→(\d+) \| F1: ([\d.]+)%→([\d.]+)% \|(?: P [\d.]+% \| R [\d.]+% \|)? (✓|✗) (accepted|rejected).*? \| ([\d.]+)s/);
    if (iterResult) {
      const entry = {
        iter:      +iterResult[1],
        param:     iterResult[2],
        prev:      +iterResult[3],
        next:      +iterResult[4],
        f1Before:  +iterResult[5],
        f1After:   +iterResult[6],
        accepted:  iterResult[7] === '✓',
        elapsed:   +iterResult[9],
      };
      state.iters.push(entry);
      if (entry.accepted) state.lastAccepted = entry;
      state.lastAction = line;
    }

    // Per-dataset progress
    const dsMatch = line.match(/dataset_(\d+)_(\d+) \[(\d+)\/(\d+)\] (\d+)ms.*?F1=([\d.]+)%/);
    if (dsMatch) {
      state.currentDataset = { name: `dataset_${dsMatch[1]}_${dsMatch[2]}`, n: +dsMatch[3], total: +dsMatch[4], f1: +dsMatch[6] };
    }

    // Testing line
    const testingMatch = line.match(/Testing (\S+): (\d+) → (\d+)/);
    if (testingMatch) {
      state.lastAction = `Testing ${testingMatch[1]}: ${testingMatch[2]} → ${testingMatch[3]}`;
    }

    // Stop reason
    const stopMatch = line.match(/Stop reason: (\S+)/);
    if (stopMatch) state.stopReason = stopMatch[1];

    // Final validation
    const validMatch = line.match(/Validation.*?F1=([\d.]+)%.*?P=([\d.]+)%.*?R=([\d.]+)%/);
    if (validMatch) {
      state.validation = { f1: +validMatch[1], p: +validMatch[2], r: +validMatch[3] };
    }
  }

  state.recentLines = lines.slice(-6);
  return state;
}

// ── Check if process is running ───────────────────────────────────────────────
function isRunning() {
  try {
    const out = execSync('pgrep -f "tune/run.ts"', { encoding: 'utf8' }).trim();
    return out.length > 0;
  } catch { return false; }
}

// ── Load checkpoint ───────────────────────────────────────────────────────────
function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch { return null; }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const alive = isRunning();
  let content = '';
  try { content = fs.readFileSync(LOG_FILE, 'utf8'); } catch { /* not started yet */ }

  const s    = parseLog(content);
  const ckpt = loadCheckpoint();
  const now  = new Date().toLocaleTimeString('en-GB');

  const phaseLabels = {
    starting: 'Starting…',
    phase3:   'Phase 3 — Baseline measurement',
    phase4:   'Phase 4 — Autonomous tuning loop',
    phase5:   'Phase 5 — Held-out validation (75k)',
    phase6:   'Phase 6 — Writing report',
    done:     'Complete ✓',
  };

  const lines = [];

  lines.push(CLEAR);
  lines.push(`${BOLD}${WHITE}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  lines.push(`${BOLD}${WHITE}║        Identity Engine Tuning — Live Dashboard               ║${RESET}`);
  lines.push(`${BOLD}${WHITE}╚══════════════════════════════════════════════════════════════╝${RESET}`);
  lines.push('');

  // Status row
  const statusStr = alive
    ? `${GREEN}${BOLD}● RUNNING${RESET}`
    : s.done
      ? `${CYAN}${BOLD}✓ FINISHED${RESET}`
      : `${RED}${BOLD}✗ NOT RUNNING${RESET}`;
  lines.push(`  Status   ${statusStr}     ${DIM}refreshed ${now}${RESET}`);
  lines.push(`  Phase    ${CYAN}${phaseLabels[s.phase] ?? s.phase}${RESET}`);
  if (s.startTime) lines.push(`  Started  ${DIM}${s.startTime}${RESET}`);
  lines.push('');

  // ── Baseline ──────────────────────────────────────────────────────────────
  lines.push(`${BOLD}  Baseline (train set)${RESET}`);
  if (s.baseline) {
    lines.push(`  F1 ${YELLOW}${s.baseline.f1.toFixed(2)}%${RESET}  P ${s.baseline.p.toFixed(2)}%  R ${s.baseline.r.toFixed(2)}%`);
  } else {
    lines.push(`  ${DIM}measuring…${RESET}`);
  }
  lines.push('');

  // ── Tuning progress ───────────────────────────────────────────────────────
  lines.push(`${BOLD}  Tuning Progress${RESET}`);
  if (s.currentIter > 0 || s.phase === 'phase4') {
    const iterStr = `${s.currentIter}/${s.maxIter}`;
    lines.push(`  Iteration  ${WHITE}${iterStr}${RESET}  ${bar(s.currentIter, s.maxIter, 30, CYAN)}`);
    lines.push(`  Best F1    ${GREEN}${BOLD}${s.bestF1.toFixed(2)}%${RESET}  ${bar(s.bestF1, 100, 30, GREEN)}`);
    lines.push(`  Plateau    ${s.plateau}/8 ${s.plateau >= 6 ? YELLOW + '(near limit)' + RESET : ''}`);
  } else {
    lines.push(`  ${DIM}waiting for Phase 4…${RESET}`);
  }
  lines.push('');

  // ── Current dataset ───────────────────────────────────────────────────────
  if (s.currentDataset) {
    const ds = s.currentDataset;
    lines.push(`${BOLD}  Current Dataset${RESET}`);
    lines.push(`  ${WHITE}${ds.name}${RESET}  [${ds.n}/${ds.total}]  ${bar(ds.n, ds.total, 20, CYAN)}  F1=${ds.f1.toFixed(1)}%`);
    lines.push('');
  }

  // ── Last action ───────────────────────────────────────────────────────────
  if (s.lastAction) {
    lines.push(`${BOLD}  Last Action${RESET}`);
    lines.push(`  ${DIM}${s.lastAction.replace(/\[.*?\]\s*/, '').slice(0, 72)}${RESET}`);
    lines.push('');
  }

  // ── Recent accepted changes ───────────────────────────────────────────────
  const accepted = s.iters.filter(i => i.accepted).slice(-5);
  if (accepted.length > 0) {
    lines.push(`${BOLD}  Accepted Changes (latest 5)${RESET}`);
    for (const e of accepted) {
      const delta = (e.f1After - e.f1Before).toFixed(2);
      const sign  = e.f1After >= e.f1Before ? GREEN + '+' : RED;
      lines.push(`  iter ${String(e.iter).padStart(2)}  ${WHITE}${e.param.padEnd(20)}${RESET} ${e.prev}→${e.next}  F1 ${sign}${delta}%${RESET}  (${e.elapsed}s)`);
    }
    lines.push('');
  }

  // ── Validation result ─────────────────────────────────────────────────────
  if (s.validation) {
    lines.push(`${BOLD}  Validation on 75k datasets${RESET}`);
    lines.push(`  F1 ${GREEN}${BOLD}${s.validation.f1.toFixed(2)}%${RESET}  P ${s.validation.p.toFixed(2)}%  R ${s.validation.r.toFixed(2)}%`);
    lines.push('');
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (s.done) {
    lines.push(`${GREEN}${BOLD}  ✓ Run complete! Stop reason: ${s.stopReason}${RESET}`);
    lines.push(`${GREEN}  Report: test-data/tune/report.json${RESET}`);
    lines.push('');
  }

  // ── Not alive warning ─────────────────────────────────────────────────────
  if (!alive && !s.done && s.currentIter > 0) {
    lines.push(`${RED}${BOLD}  ⚠ Process stopped unexpectedly!${RESET}`);
    lines.push(`${YELLOW}  Run: npm run tune:run:resume   to continue from iter ${s.currentIter}${RESET}`);
    lines.push('');
  }

  lines.push(`${DIM}  Log: tail -f /tmp/tune.log   |   Ctrl+C quits dashboard (pipeline keeps running)${RESET}`);
  lines.push('');

  process.stdout.write(lines.join('\n'));
}

// ── Main loop ─────────────────────────────────────────────────────────────────
render();
const interval = setInterval(render, REFRESH_MS);

process.on('SIGINT', () => {
  clearInterval(interval);
  process.stdout.write('\n\x1b[?25h'); // restore cursor
  process.stdout.write(`\n${CYAN}Dashboard closed. Pipeline still running in background.${RESET}\n`);
  process.exit(0);
});
