import { env } from '@/lib/utils/env';

export function areInvestigationWritesEnabled(): boolean {
  return env.INVESTIGATIONS_ENABLED === 'true';
}

export function isInvestigationEmailDispatchEnabled(): boolean {
  return (
    areInvestigationWritesEnabled()
    && env.INVESTIGATION_EMAIL_DISPATCH_ENABLED === 'true'
  );
}

export const INVESTIGATION_WRITES_DISABLED_MESSAGE =
  'Investigation changes are disabled for this environment. Existing investigation history remains readable.';

export const INVESTIGATION_EMAIL_DISABLED_MESSAGE =
  'Investigation email dispatch is disabled for this environment. Copy or portal workflows remain available when investigation writes are enabled.';
