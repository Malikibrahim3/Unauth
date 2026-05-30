import { createLogger } from '@/lib/log';

const widgetLogger = createLogger({ route: '/api/gorgias/widget' });

/** Structured logging for Gorgias HTTP sidebar widget. */
export function gorgiasWidgetLog(event: string, payload: Record<string, unknown> = {}): void {
  widgetLogger.info(`[gorgias.widget] ${event}`, payload);
}

export function gorgiasWidgetLogError(event: string, err: unknown, payload: Record<string, unknown> = {}): void {
  widgetLogger.error(`[gorgias.widget] ${event}`, { ...payload, error: err });
}
