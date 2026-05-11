import * as Sentry from '@sentry/nextjs';
import { redactSensitiveData } from '@/lib/log';

const TRACES_SAMPLE_RATE = 0.1;
const ERROR_SAMPLE_RATE = 1;

let clientInitialised = false;
let serverInitialised = false;

function getEnvironment(): string {
  return process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';
}

function getDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
}

function scrubEvent<T>(event: T): T {
  return redactSensitiveData(event);
}

function buildOptions() {
  return {
    dsn: getDsn(),
    enabled: Boolean(getDsn()),
    environment: getEnvironment(),
    tracesSampleRate: TRACES_SAMPLE_RATE,
    sampleRate: ERROR_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend(event: Sentry.ErrorEvent) {
      return scrubEvent(event);
    },
    beforeSendTransaction(event: any) {
      return scrubEvent(event);
    },
  };
}

export function initSentryClient() {
  if (clientInitialised || typeof window === 'undefined') {
    return;
  }

  Sentry.init(buildOptions());
  clientInitialised = true;
}

export function initSentryServer() {
  if (serverInitialised || typeof window !== 'undefined') {
    return;
  }

  Sentry.init(buildOptions());
  serverInitialised = true;
}

type CaptureContext = {
  requestId?: string | null;
  merchantId?: string | null;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  [key: string]: unknown;
};

function applyScope(scope: Sentry.Scope, context?: CaptureContext) {
  if (!context) {
    return;
  }

  if (context.requestId) scope.setTag('requestId', context.requestId);
  if (context.merchantId) scope.setTag('merchantId', context.merchantId);
  if (context.route) scope.setTag('route', context.route);
  if (context.method) scope.setTag('method', context.method);
  if (typeof context.status === 'number') scope.setTag('status', String(context.status));

  scope.setContext('request', scrubEvent(context));
}

export function captureServerException(error: unknown, context?: CaptureContext) {
  initSentryServer();

  if (!getDsn()) {
    return;
  }

  Sentry.withScope((scope) => {
    applyScope(scope, context);
    Sentry.captureException(error);
  });
}

export function captureClientException(error: unknown, context?: CaptureContext) {
  initSentryClient();

  if (!getDsn()) {
    return;
  }

  Sentry.withScope((scope) => {
    applyScope(scope, context);
    Sentry.captureException(error);
  });
}

export function captureSentryMessage(message: string, context?: CaptureContext) {
  if (typeof window === 'undefined') {
    initSentryServer();
  } else {
    initSentryClient();
  }

  if (!getDsn()) {
    return;
  }

  Sentry.withScope((scope) => {
    applyScope(scope, context);
    Sentry.captureMessage(message);
  });
}

export const sentrySampling = {
  tracesSampleRate: TRACES_SAMPLE_RATE,
  errorSampleRate: ERROR_SAMPLE_RATE,
};
