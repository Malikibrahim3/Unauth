import { redactSensitiveData } from '@/lib/log';

const WIDGET_ROUTE = '/api/gorgias/widget';

type WidgetLogLevel = 'info' | 'error';

/**
 * Emit one JSON line via console.log / console.error (not console.info).
 * Vercel runtime logs reliably show console.log for this route; createLogger uses
 * console.info which does not appear in the same log stream/filter as build_marker.
 */
function emitWidgetLog(level: WidgetLogLevel, message: string, payload: Record<string, unknown> = {}): void {
  const entry = redactSensitiveData({
    timestamp: new Date().toISOString(),
    level,
    message,
    route: WIDGET_ROUTE,
    ...payload,
  });
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Structured logging for Gorgias HTTP sidebar widget (no tokens or raw PII). */
export function gorgiasWidgetLog(event: string, payload: Record<string, unknown> = {}): void {
  emitWidgetLog('info', `[gorgias.widget] ${event}`, payload);
}

export function gorgiasWidgetLogError(event: string, err: unknown, payload: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  emitWidgetLog('error', `[gorgias.widget] ${event}`, { ...payload, errorMessage: message, errorStack: stack });
}
