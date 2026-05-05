/**
 * riskStyles — canonical risk-level style helpers.
 *
 * These functions are the SINGLE SOURCE OF TRUTH for translating a risk level
 * string into inline CSS properties for risk badges and progress bars.
 *
 * All components should import from here instead of defining their own local
 * copies. See the App Cohesion Audit at reports/ui-ux-audit/APP_COHESION_AUDIT.md
 * for full context.
 *
 * Usage:
 *   import { riskTok, riskBadgeStyle, riskBarStyle } from '@/lib/utils/riskStyles'
 */

import type { CSSProperties } from 'react';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Normalises any risk level string to one of the four canonical CSS variable tokens.
 * Falls back to 'low' for unknown / null values.
 */
export function riskTok(level: string | null | undefined): RiskLevel {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'critical';
    case 'high':     return 'high';
    case 'medium':   return 'medium';
    default:         return 'low';
  }
}

/**
 * Returns inline styles for a coloured risk badge (pill / chip).
 * Reads from the app's CSS custom properties so it honours dark mode.
 */
export function riskBadgeStyle(level: string | null | undefined): CSSProperties {
  const t = riskTok(level);
  return {
    background:  `var(--risk-${t}-bg)`,
    color:       `var(--risk-${t})`,
    border:      `1px solid var(--risk-${t}-bd)`,
    borderColor: `var(--risk-${t}-bd)`,
  };
}

/**
 * Returns inline styles for a horizontal risk progress bar.
 */
export function riskBarStyle(level: string | null | undefined): CSSProperties {
  return { background: `var(--risk-${riskTok(level)})` };
}

/**
 * Returns badge styles for a signal/flag severity level.
 * Severity levels (weak/possible/probable) are remapped to risk colours
 * because flag severity intentionally uses the same colour scale.
 */
export function severityStyle(severity: string | null | undefined): CSSProperties {
  const map: Record<string, string> = { low: 'medium', medium: 'high', high: 'critical' };
  const t = riskTok(map[(severity ?? '').toLowerCase()] ?? severity);
  return {
    background: `var(--risk-${t}-bg)`,
    color: `var(--risk-${t})`,
    borderColor: `var(--risk-${t}-bd)`,
  };
}

/**
 * Converts a numeric risk score (0–100) to a grade string.
 * Used on audit pages where only a numeric score is available.
 */
export function scoreToGrade(score: number): 'definite' | 'probable' | 'possible' | 'weak' {
  if (score >= 85) return 'definite';
  if (score >= 70) return 'probable';
  if (score >= 55) return 'possible';
  return 'weak';
}
