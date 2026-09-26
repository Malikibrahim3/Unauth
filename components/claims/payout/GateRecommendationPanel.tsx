'use client';

import Link from 'next/link';
import type { GateRecommendation } from '@/lib/claim-gate/buildRecommendation';
import { formatCurrency } from '@/lib/utils/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Renders the deterministic gate recommendation in neutral plain English.
 * Mirrors the Gorgias internal note — no raw scores, no accusatory language.
 * The merchant's rules make the recommendation; Unauth surfaces the reasoning.
 */

export function GateRecommendationPanel({ recommendation }: { recommendation: GateRecommendation | null }) {
  if (!recommendation) {
    return (
      <Card unstyled as="section" variant="panel" className="p-4">
        <h3 className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>Recommendation</h3>
        <p className="text-[13px] leading-5 text-[#40454a] mt-1" style={{ color: '#64686d' }}>
          No rule applies. Standard review remains the default recommendation source.
        </p>
        <Link href="/controls/rules" className="text-[11px] font-medium leading-4 text-[#64686d] mt-2 inline-block underline underline-offset-2" style={{ color: '#1c1f23' }}>
          Review rules
        </Link>
      </Card>
    );
  }

  const held = recommendation.decision === 'hold';
  const strength = recommendation.reasoning.evidence_strength;
  const availableRoutes = recommendation.recovery_routes.filter((route) => route.available);

  return (
    <Card unstyled as="section" variant="panel" className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
          Review gate
        </h3>
        <StatusBadge family="workflowStatus" value={held ? 'hold' : 'proceed'} />
      </div>

      <div>
        {recommendation.reasoning.triggered_rules.length > 0 ? (
          <>
            <p className="text-caption font-medium mb-1.5" style={{ color: '#64686d' }}>
              Why:
            </p>
            <ul className="space-y-1.5">
              {recommendation.reasoning.triggered_rules.map((rule) => (
                <li key={rule.rule_name} className="text-caption" style={{ color: '#1c1f23' }}>
                  <span className="font-medium">Rule “{rule.rule_name}”</span>
                  {rule.conditions_met.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {rule.conditions_met.map((condition) => (
                        <li key={condition} className="flex gap-1.5">
                          <span aria-hidden style={{ color: '#6f6a63' }}>
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
          <p className="text-caption" style={{ color: '#64686d' }}>
            No review rules triggered.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption" style={{ color: '#64686d' }}>
          Evidence:
        </span>
        <StatusBadge family="evidenceStrength" value={strength} size="sm" />
        <span className="text-caption" style={{ color: '#6f6a63' }}>
          {recommendation.reasoning.evidence_strength_explanation}
        </span>
      </div>

      <p className="text-caption" style={{ color: '#64686d' }}>
        Money at risk:{' '}
        <span className="font-semibold" style={{ color: '#1c1f23' }}>
          {formatCurrency(recommendation.money_at_risk, recommendation.currency)}
        </span>
      </p>

      <div>
        <p className="text-caption font-medium mb-1" style={{ color: '#64686d' }}>
          Recovery available:
        </p>
        {availableRoutes.length > 0 ? (
          <ul className="space-y-1">
            {availableRoutes.map((route) => (
              <li key={route.route} className="text-caption flex gap-1.5" style={{ color: '#1c1f23' }}>
                <span aria-hidden style={{ color: '#6f6a63' }}>
                  •
                </span>
                <span>{route.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption" style={{ color: '#6f6a63' }}>
            None identified yet.
          </p>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: '#eae8e5' }}>
        <p className="text-caption" style={{ color: '#1c1f23' }}>
          <span className="font-medium" style={{ color: '#64686d' }}>
            Suggested next step:{' '}
          </span>
          {recommendation.suggested_next_step}
        </p>
      </div>

      {recommendation.limitations.length > 0 && (
        <ul className="space-y-1 pt-1">
          {recommendation.limitations.map((limitation) => (
            <li key={limitation} className="text-caption" style={{ color: '#6f6a63' }}>
              Note: {limitation}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
