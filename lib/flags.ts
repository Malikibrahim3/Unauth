/**
 * Phase E — Feature Flags
 *
 * All Phase E wow-factor features are default-OFF.
 * To enable a flag in an environment, set the corresponding env var to "true".
 *
 * Naming convention:  NEXT_PUBLIC_FLAG_<FEATURE_NAME>
 *
 * IMPORTANT: flags that gate UI-only features use NEXT_PUBLIC_ so they are
 * available in both Server Components and Client Components without a
 * round-trip.  Flags that gate server-only behaviour (e.g. search endpoints)
 * use the same env var but are also read server-side via process.env.
 *
 * Frozen-core guardrail: no flag in this file may enable a code path that
 * writes to or modifies lib/linker.ts, lib/identity/*, lib/engine/*,
 * lib/processing/*, lib/evidence/narrative.ts, or lib/evidence/ce3.ts.
 */

function boolFlag(envKey: string, defaultValue = false): boolean {
  if (typeof process !== 'undefined' && process.env[envKey] === 'true') return true;
  // In browser (Client Components), Next.js statically replaces NEXT_PUBLIC_ vars at build time.
  // The env-var check above covers both server and build-time substitution.
  return defaultValue;
}

/** E-1  ConfidenceExplanationPanel — click badge to see scoring inputs */
export const FLAG_CONFIDENCE_PANEL = boolFlag(
  'NEXT_PUBLIC_FLAG_CONFIDENCE_PANEL',
);

/** E-2  Cross-Merchant Signal Explanation card on customer drawer + detail */
export const FLAG_CROSS_MERCHANT_SIGNALS = boolFlag(
  'NEXT_PUBLIC_FLAG_CROSS_MERCHANT_SIGNALS',
);

/** E-3  Horizontal RiskTimeline on customer detail */
export const FLAG_RISK_TIMELINE = boolFlag(
  'NEXT_PUBLIC_FLAG_RISK_TIMELINE',
);

/** E-4  ROI / Savings card on dashboard secondary row */
export const FLAG_SAVINGS_CARD = boolFlag(
  'NEXT_PUBLIC_FLAG_SAVINGS_CARD',
);

/** E-5  Analyst Command Center — extended ⌘K with multi-entity search */
export const FLAG_COMMAND_CENTER = boolFlag(
  'NEXT_PUBLIC_FLAG_COMMAND_CENTER',
);

/** E-6  Review Queue Prioritisation — sort by confidence × exposure */
export const FLAG_QUEUE_PRIORITISATION = boolFlag(
  'NEXT_PUBLIC_FLAG_QUEUE_PRIORITISATION',
);

/** E-8 Experience polish v1 — case-file interior system and delight layer */
export const FLAG_EXPERIENCE_POLISH_V1 = boolFlag(
  'NEXT_PUBLIC_FLAG_EXPERIENCE_POLISH_V1',
  true,
);

/**
 * E-7  Identity Cluster Visualisation — HIGH risk, deferred.
 *
 * Requires:
 * - Senior code review before landing.
 * - Coordination with Phase 4 (ASOS_REMEDIATION_PROGRAM.md).
 * - react-flow or d3-force dependency sign-off.
 *
 * DO NOT enable on main until the above gates are cleared.
 */
export const FLAG_IDENTITY_CLUSTER_GRAPH = boolFlag(
  'NEXT_PUBLIC_FLAG_IDENTITY_CLUSTER_GRAPH',
  false, // explicit — never accidentally default-on
);

/**
 * F-1  Saved Views (/saved) sidebar entry — Phase 5.16 v1 gate.
 *
 * The /saved page exists but Phase 5.16 (saved-view persistence, API, and
 * DB migration) has not shipped.  The sidebar entry MUST remain hidden until
 * this flag is explicitly enabled in the target environment.
 *
 * To reveal the sidebar link: set NEXT_PUBLIC_FLAG_SAVED_VIEWS=true in .env.
 * Do NOT default-on this flag.
 */
export const FLAG_SAVED_VIEWS = boolFlag(
  'NEXT_PUBLIC_FLAG_SAVED_VIEWS',
  false, // explicit — do not expose until Phase 5.16 v1 ships
);
