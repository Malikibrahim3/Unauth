import type { GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { tierHeadline } from '@/lib/gorgias/widgetData';

/** Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly. */
export type GorgiasWidgetJsonPayload = {
  risk_level: string;
  risk_score: string;
  cross_merchant: string;
  fraud_flags: string;
};

function toWidgetJsonPayload(fields: {
  risk_level: string;
  risk_score: number | string;
  cross_merchant: string;
  fraud_flags: string;
}): GorgiasWidgetJsonPayload {
  return {
    risk_level: fields.risk_level,
    risk_score: String(fields.risk_score),
    cross_merchant: fields.cross_merchant,
    fraud_flags: fields.fraud_flags,
  };
}

function formatCrossMerchant(
  crossMerchant: { merchant_count: number; claim_count: number } | null
): string {
  if (!crossMerchant || crossMerchant.merchant_count <= 0) return 'No other merchants';
  const merchants = `${crossMerchant.merchant_count} merchant${crossMerchant.merchant_count === 1 ? '' : 's'}`;
  const claims = `${crossMerchant.claim_count} claim${crossMerchant.claim_count === 1 ? '' : 's'}`;
  return `${merchants} · ${claims}`;
}

export function gorgiasWidgetModelToJson(model: GorgiasWidgetModel): GorgiasWidgetJsonPayload {
  if (model.state === 'error') {
    return toWidgetJsonPayload({
      risk_level: 'ERROR',
      risk_score: 0,
      cross_merchant: '—',
      fraud_flags: model.message,
    });
  }

  if (model.state === 'not_found') {
    return toWidgetJsonPayload({
      risk_level: 'NONE',
      risk_score: 0,
      cross_merchant: 'Not in Unauth network',
      fraud_flags: 'No history yet',
    });
  }

  if (model.state === 'merchant_profile') {
    return toWidgetJsonPayload({
      risk_level: model.riskLevel.trim().toUpperCase() || 'UNKNOWN',
      risk_score: Math.round(model.riskScore),
      cross_merchant: 'Not available',
      fraud_flags: model.fraudFlags.length > 0 ? model.fraudFlags.join(', ') : 'None',
    });
  }

  if (model.state === 'low_clear') {
    return toWidgetJsonPayload({
      risk_level: 'LOW',
      risk_score: model.merchantProfile.riskScore,
      cross_merchant: 'No cross-merchant flags',
      fraud_flags: 'None',
    });
  }

  const signals = model.lookup.signals.length > 0 ? model.lookup.signals.join('; ') : 'None';

  return toWidgetJsonPayload({
    risk_level: tierHeadline(model.tier),
    risk_score: model.lookup.risk_score ?? 0,
    cross_merchant: formatCrossMerchant(model.lookup.cross_merchant),
    fraud_flags: signals,
  });
}
