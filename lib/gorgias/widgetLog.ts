type GorgiasWidgetLogPayload = Record<string, string | number | boolean | null | undefined>;

/** Structured logging for Gorgias HTTP sidebar widget (no tokens or raw PII). */
export function gorgiasWidgetLog(event: string, payload: GorgiasWidgetLogPayload = {}): void {
  console.log('[gorgias.widget] widgetLog_helper_invoked');
  console.log(`[gorgias.widget] ${event} ${JSON.stringify(payload)}`);
}

export function gorgiasWidgetLogError(event: string, err: unknown, payload: GorgiasWidgetLogPayload = {}): void {
  console.log('[gorgias.widget] widgetLog_helper_invoked');
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    `[gorgias.widget] ${event} ${JSON.stringify({ ...payload, message, stack })}`
  );
}
