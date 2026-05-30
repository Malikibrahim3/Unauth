type GorgiasWidgetLogPayload = Record<string, string | number | boolean | null | undefined>;

/** Structured logging for Gorgias HTTP sidebar widget (no tokens or raw PII). */
export function gorgiasWidgetLog(event: string, payload: GorgiasWidgetLogPayload = {}): void {
  console.log(`[gorgias.widget] ${event}`, payload);
}
