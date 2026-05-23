/**
 * SINGLE SOURCE OF TRUTH — Risk level utilities
 *
 * Pure utility functions for converting numeric scores to risk levels.
 * Kept in lib/ so application code can import without depending on UI components.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Maps a numeric score to a risk level */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
