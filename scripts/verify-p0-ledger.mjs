import { readFileSync } from 'node:fs';

const ledgerPath = 'docs/audits/unauth-mvp-plus/07-p0-verification-ledger.md';
const statusPath = 'docs/audits/unauth-mvp-plus/remediation-status.md';
const ledger = readFileSync(ledgerPath, 'utf8');
const statusLedger = readFileSync(statusPath, 'utf8');
const sectionStart = ledger.indexOf('## 9. Atomic MVP+ P0 remediation recheck');

if (sectionStart < 0) throw new Error('Atomic P0 remediation section is missing');

const rows = [...ledger.slice(sectionStart).matchAll(
  /^\| ([A-Z][A-Z0-9]{1,3}-\d{3}) \| (PASS|FAIL|UNVERIFIED) \| ([^|]+) \|$/gm,
)].map((match) => ({ id: match[1], status: match[2], evidence: match[3].trim() }));
const ids = new Set(rows.map((row) => row.id));
const namespaces = new Set(rows.map((row) => row.id.split('-')[0]));
const counts = Object.fromEntries(
  ['PASS', 'FAIL', 'UNVERIFIED'].map((state) => [
    state,
    rows.filter((row) => row.status === state).length,
  ]),
);

if (rows.length !== 322) throw new Error(`Expected 322 P0 rows, found ${rows.length}`);
if (ids.size !== rows.length) throw new Error('Atomic P0 ledger contains duplicate IDs');
if (namespaces.size !== 44) throw new Error(`Expected 44 P0 namespaces, found ${namespaces.size}`);
if (rows.some((row) => row.evidence.length === 0)) throw new Error('P0 row has no evidence or gap key');
if (counts.FAIL !== 0) throw new Error(`Atomic P0 ledger contains ${counts.FAIL} FAIL row(s)`);

const publishedCounts = statusLedger.match(/(\d+) PASS, (\d+) FAIL, (\d+) UNVERIFIED/);
if (!publishedCounts) throw new Error('Remediation status does not publish P0 state counts');
const expectedCounts = {
  PASS: Number(publishedCounts[1]),
  FAIL: Number(publishedCounts[2]),
  UNVERIFIED: Number(publishedCounts[3]),
};
if (JSON.stringify(counts) !== JSON.stringify(expectedCounts)) {
  throw new Error(`P0 count mismatch: atomic=${JSON.stringify(counts)} status=${JSON.stringify(expectedCounts)}`);
}

console.log(
  `Atomic P0 ledger passed (${rows.length} unique rows; ${namespaces.size} namespaces; `
  + `${counts.PASS} PASS, ${counts.UNVERIFIED} UNVERIFIED).`,
);
