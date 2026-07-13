'use client';

import type { GateRecommendation } from '@/lib/claim-gate/buildRecommendation';
import { formatCurrency } from '@/lib/utils/format';
import { PanelCard } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Renders the deterministic gate recommendation in neutral plain English.
 * Mirrors the Gorgias internal note — no raw scores, no accusatory language.
 * The merchant's rules make the recommendation; Unauth surfaces the reasoning.
 */

export function GateRecommendationPanel({ recommendation }: { recommendation: GateRecommendation | null }) {
  if (!recommendation) {
    return (
      <PanelCard as="section" variant="app" className="p-4">
        <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>Recommendation</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No merchant rule matched this case yet. Review the evidence and record your decision.
        </p>
      </PanelCard>
    );
  }

  const held = recommendation.decision === 'hold';
  const strength = recommendation.reasoning.evidence_strength;
  const availableRoutes = recommendation.recovery_routes.filter((route) => route.available);

  return (
    <PanelCard as="section" variant="app" className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
          Review gate
        </h3>
        <StatusBadge family="workflowStatus" value={held ? 'hold' : 'proceed'} />
      </div>

      <div>
        {recommendation.reasoning.triggered_rules.length > 0 ? (
          <>
            <p className="text-caption font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Why:
            </p>
            <ul className="space-y-1.5">
              {recommendation.reasoning.triggered_rules.map((rule) => (
                <li key={rule.rule_name} className="text-caption" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-medium">Rule “{rule.rule_name}”</span>
                  {rule.conditions_met.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {rule.conditions_met.map((condition) => (
                        <li key={condition} className="flex gap-1.5">
                          <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
                            •
                          </span>
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            No review rules triggered.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
          Evidence:
        </span>
        <StatusBadge family="evidenceStrength" value={strength} size="sm" />
        <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
          {recommendation.reasoning.evidence_strength_explanation}
        </span>
      </div>

      <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
        Money at risk:{' '}
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(recommendation.money_at_risk, recommendation.currency)}
        </span>
      </p>

      <div>
        <p className="text-caption font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Recovery available:
        </p>
        {availableRoutes.length > 0 ? (
          <ul className="space-y-1">
            {availableRoutes.map((route) => (
              <li key={route.route} className="text-caption flex gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
                  •
                </span>
                <span>{route.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
            None identified yet.
          </p>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-caption" style={{ color: 'var(--text-primary)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Suggested next step:{' '}
          </span>
          {recommendation.suggested_next_step}
        </p>
      </div>

      {recommendation.limitations.length > 0 && (
        <ul className="space-y-1 pt-1">
          {recommendation.limitations.map((limitation) => (
            <li key={limitation} className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
              Note: {limitation}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
