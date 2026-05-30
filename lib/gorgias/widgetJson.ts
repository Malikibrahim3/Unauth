import type { GorgiasWidgetModel } from '@/lib/gorgias/widgetData';
import { tierHeadline } from '@/lib/gorgias/widgetData';

/** Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly. */
export type GorgiasWidgetJsonPayload = {
  risk_level: string;
  identity_confidence_grade: string;
  match_score: string;
  fraud_flags: string;
};

function toWidgetJsonPayload(fields: {
  risk_level: string;
  identity_confidence_grade: string;
  match_score: number | string;
  fraud_flags: string;
}): GorgiasWidgetJsonPayload {
  return {
    risk_level: fields.risk_level,
    identity_confidence_grade: fields.identity_confidence_grade,
    match_score: String(fields.match_score),
    fraud_flags: fields.fraud_flags,
  };
}

export function gorgiasWidgetModelToJson(model: GorgiasWidgetModel): GorgiasWidgetJsonPayload {
  if (model.state === 'error') {
    return toWidgetJsonPayload({
      risk_level: 'ERROR',
      identity_confidence_grade: 'N/A',
      match_score: 0,
      fraud_flags: model.message,
    });
  }

  if (model.state === 'not_found') {
    return toWidgetJsonPayload({
      risk_level: 'NONE',
      identity_confidence_grade: 'N/A',
      match_score: 0,
      fraud_flags: 'Not in Unauth network',
    });
  }

  if (model.state === 'low_clear') {
    return toWidgetJsonPayload({
      risk_level: 'LOW',
      identity_confidence_grade: 'N/A',
      match_score: model.merchantProfile.riskScore,
      fraud_flags: 'No cross-merchant flags',
    });
  }

  const signals = model.lookup.signals.length > 0 ? model.lookup.signals.join('; ') : 'None';

  return toWidgetJsonPayload({
    risk_level: tierHeadline(model.tier),
    identity_confidence_grade: model.lookup.risk_grade || 'N/A',
    match_score: model.lookup.risk_score ?? 0,
    fraud_flags: signals,
  });
}
