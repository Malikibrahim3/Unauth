import { OperationalRouteError } from '@/components/states/OperationalRouteError';

interface ErrorBoundaryUIProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  fallbackHref?: string;
}

/**
 * Reusable route error state.
 *
 * RUN-11: the merchant sees what failed and what to do about it. The
 * JavaScript error name used to be rendered as "Error type: TypeError", which
 * tells a merchant nothing and tells an attacker something; the diagnostic
 * identifier now goes to the log only, where support can correlate it.
 */
export function ErrorBoundaryUI({
  error,
  reset,
  title = 'Something went wrong',
  description = 'We could not load this page. You can try again, or go back to Overview.',
  fallbackHref,
}: ErrorBoundaryUIProps) {
  return (
    <OperationalRouteError
      title={title}
      description={description}
      reset={reset}
      digest={error.digest}
      fallbackHref={fallbackHref}
    />
  );
}
