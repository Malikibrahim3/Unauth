import type { GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { tierHeadline } from '@/lib/gorgias/widgetData';

export type GorgiasWidgetJsonPayload = {
  risk_level: string;
  identity_confidence_grade: string;
  match_score: number;
  fraud_flags: string;
};

export function gorgiasWidgetModelToJson(model: GorgiasWidgetModel): GorgiasWidgetJsonPayload {
  if (model.state === 'error') {
    return {
      risk_level: 'ERROR',
      identity_confidence_grade: 'N/A',
      match_score: 0,
      fraud_flags: model.message,
    };
  }

  if (model.state === 'not_found') {
    return {
      risk_level: 'NONE',
      identity_confidence_grade: 'N/A',
      match_score: 0,
      fraud_flags: 'Not in Unauth network',
    };
  }

  if (model.state === 'low_clear') {
    return {
      risk_level: 'LOW',
      identity_confidence_grade: 'N/A',
      match_score: model.merchantProfile.riskScore,
      fraud_flags: 'No cross-merchant flags',
    };
  }

  const signals = model.lookup.signals.length > 0 ? model.lookup.signals.join('; ') : 'None';

  return {
    risk_level: tierHeadline(model.tier),
    identity_confidence_grade: model.lookup.risk_grade,
    match_score: model.lookup.risk_score,
    fraud_flags: signals,
  };
}
