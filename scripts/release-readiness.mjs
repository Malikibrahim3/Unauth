import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const checks = [
  ["TypeScript", "npm", ["run", "typecheck"]],
  [
    "Lint (zero warnings)",
    "npx",
    ["eslint", "app", "components", "lib", "--max-warnings=0"],
  ],
  ["Full Jest suite", "npm", ["test", "--", "--runInBand"]],
  ["Production build", "npm", ["run", "build"]],
  ["Whitespace integrity", "git", ["diff", "--check"]],
];

let failed = 0;
for (const [name, command, args] of checks) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

const migrations = [
  "supabase/migrations/20260712121000_phase4_connected_objects.sql",
  "supabase/migrations/20260712130000_phase5_reporting_dimensions.sql",
  "supabase/migrations/20260713090000_phase6_configuration_versions.sql",
  "supabase/migrations/20260713100000_financial_reconciliation_hardening.sql",
  "supabase/migrations/20260713103000_work_task_projection.sql",
  "supabase/migrations/20260713110000_atomic_configuration_publication.sql",
  "supabase/migrations/20260713113000_configuration_draft_creation.sql",
  "supabase/migrations/20260713114000_configuration_version_backfill.sql",
  "supabase/migrations/20260713115000_rule_version_privileges.sql",
  "supabase/migrations/20260713116000_notification_preference_contract.sql",
  "supabase/migrations/20260713117000_sync_job_counters.sql",
  "supabase/migrations/20260713118000_atomic_work_task_bulk_actions.sql",
  "supabase/migrations/20260713119000_configuration_archive_history.sql",
];

for (const file of migrations) {
  if (!existsSync(file)) {
    failed += 1;
    console.error(`FAIL missing migration ${file}`);
    continue;
  }
  const sql = readFileSync(file, "utf8").toLowerCase();
  if (!sql.includes("begin;") || !sql.includes("commit;")) {
    failed += 1;
    console.error(`FAIL non-transactional migration ${file}`);
  } else {
    console.log(`PASS migration transaction ${file}`);
  }
}

const migrationStatus = spawnSync(
  "npx",
  ["supabase", "db", "push", "--dry-run"],
  { encoding: "utf8", shell: false },
);
const migrationOutput = `${migrationStatus.stdout ?? ""}\n${migrationStatus.stderr ?? ""}`;
if (migrationStatus.status !== 0) {
  failed += 1;
  console.error("FAIL remote migration status could not be verified");
} else if (/Would push these migrations:\s*[\s\S]*•/.test(migrationOutput)) {
  failed += 1;
  console.error("FAIL unapplied remote migrations detected");
} else {
  console.log("PASS remote migrations are current");
}

console.log(
  JSON.stringify({
    status: failed ? "blocked" : "ready",
    failedChecks: failed,
    checkedAt: new Date().toISOString(),
  }),
);
process.exitCode = failed ? 1 : 0;
