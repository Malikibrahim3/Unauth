"use client";

import type { FormattedClaimDecision } from "@/lib/claims/decision/format";
import { RailSection } from "@/components/claims/claimReviewPrimitives";

export type ClaimDecisionPayload = {
  formatted: FormattedClaimDecision;
  evaluatedAt: string;
  evaluation: {
    recommendation: string;
    rule_name: string | null;
    matched_conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
      actual_value: unknown;
    }>;
    justification_lines: string[];
  };
  ruleCount: number;
};

const TONE_STYLES: Record<string, { bg: string; color: string }> = {
  success: { bg: "var(--success-bg)", color: "var(--success)" },
  warning: { bg: "var(--warning-bg)", color: "var(--warning)" },
  danger: { bg: "var(--danger-bg)", color: "var(--danger)" },
  neutral: { bg: "var(--surface-raised)", color: "var(--text-secondary)" },
};

export function ClaimDecisionRecommendationCard({
  claimId,
  loading,
  error,
  data,
  stale,
  onRefresh,
  open,
  onToggle,
}: {
  claimId: string | null;
  loading: boolean;
  error: string | null;
  data: ClaimDecisionPayload | null;
  stale?: boolean;
  onRefresh?: () => void;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const formatted = data?.formatted;
  const tone = formatted?.tone ?? "neutral";
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;

  return (
    <RailSection
      id="recommendation"
      title="Recommendation"
      open={open}
      onToggle={onToggle}
      highlighted
    >
      {!claimId && (
        <p className="text-caption" style={{ color: "var(--text-tertiary)" }}>
          Save the support payout case to generate a merchant-rule
          recommendation.
        </p>
      )}

      {claimId && (
        <div className="flex items-center justify-between gap-2 mb-1">
          {stale && !loading && (
            <p className="text-caption" style={{ color: "var(--warning)" }}>
              Case context changed - recommendation may be outdated.
            </p>
          )}
          {onRefresh && (
            <button
              type="button"
              className="text-caption ml-auto shrink-0 underline-offset-2 hover:underline disabled:opacity-50"
              style={{ color: "var(--text-secondary)" }}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh recommendation
            </button>
          )}
        </div>
      )}

      {claimId && loading && (
        <p className="text-caption" style={{ color: "var(--text-tertiary)" }}>
          Evaluating merchant rules…
        </p>
      )}

      {claimId && error && !loading && (
        <p className="text-caption" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {claimId && formatted && !loading && !error && (
        <div className="space-y-3">
          <div>
            <span
              className="inline-block text-body font-semibold rounded-full px-2.5 py-1"
              style={{ background: styles.bg, color: styles.color }}
            >
              {formatted.recommendationLabel}
            </span>
            {formatted.ruleName && (
              <p
                className="mt-2 text-caption"
                style={{ color: "var(--text-secondary)" }}
              >
                Based on merchant rule: <strong>{formatted.ruleName}</strong>
              </p>
            )}
          </div>

          {formatted.matchedConditions.length > 0 && (
            <div>
              <p
                className="text-caption font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Why this matched:
              </p>
              <ul className="space-y-1">
                {formatted.matchedConditions.map((line) => (
                  <li
                    key={`${line.label}-${line.actual}`}
                    className="text-caption flex gap-1.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span style={{ color: "var(--success)" }} aria-hidden>
                      ✓
                    </span>
                    <span>
                      {line.label}
                      {line.actual ? ` ${line.actual}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(formatted.isNoMatch || formatted.isNoRules) && (
            <p
              className="text-caption"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatted.summary}
            </p>
          )}

          {data?.evaluatedAt && (
            <p
              className="text-caption"
              style={{ color: "var(--text-tertiary)" }}
            >
              Evaluated{" "}
              {new Date(data.evaluatedAt).toLocaleString("en-US", {
                timeZone: "UTC",
              })}
            </p>
          )}

          <p
            className="text-caption leading-relaxed pt-1 border-t"
            style={{
              color: "var(--text-tertiary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            Unauth applies your rules to the available claim context. Your team
            makes the final decision.
          </p>
        </div>
      )}
    </RailSection>
  );
}
