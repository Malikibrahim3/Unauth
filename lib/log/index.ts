import { NextResponse } from 'next/server';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  requestId?: string | null;
  merchantId?: string | null;
  route?: string | null;
  method?: string | null;
  status?: number | null;
  durationMs?: number | null;
  [key: string]: unknown;
};

type RouteHandler<TArgs extends unknown[]> = (...args: TArgs) => Response | Promise<Response>;

const REQUEST_ID_HEADER = 'x-request-id';
const MERCHANT_ID_HEADER = 'x-merchant-id';
const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|refresh[-_]?token|session|email|e-mail|ip|ipAddress|address|line1|line2|street|city|postcode|postal|zip|phone|ssn|dob)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const IPV6_PATTERN = /\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9:]{1,4}\b/i;

function isHeadersLike(value: unknown): value is Headers {
  return typeof value === 'object' && value !== null && 'get' in value && typeof (value as Headers).get === 'function';
}

function isRequestLike(value: unknown): value is Request {
  return typeof value === 'object' && value !== null && 'headers' in value && 'method' in value;
}

function isSensitiveKey(key?: string | null): boolean {
  return !!key && SENSITIVE_KEY_PATTERN.test(key);
}

function isSensitiveString(value: string): boolean {
  return EMAIL_PATTERN.test(value) || IPV4_PATTERN.test(value) || IPV6_PATTERN.test(value);
}

function serialiseHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export function redactSensitiveData<T>(value: T): T {
  const seen = new WeakSet<object>();

  const scrub = (input: unknown, key?: string): unknown => {
    if (isSensitiveKey(key)) {
      return REDACTED;
    }

    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return isSensitiveString(input) ? REDACTED : input;
    }

    if (typeof input !== 'object') {
      return input;
    }

    if (input instanceof Error) {
      return {
        name: input.name,
        message: isSensitiveString(input.message) ? REDACTED : input.message,
        stack: input.stack,
      };
    }

    if (input instanceof Headers) {
      return scrub(serialiseHeaders(input));
    }

    if (Array.isArray(input)) {
      return input.map((entry) => scrub(entry));
    }

    if (seen.has(input)) {
      return '[Circular]';
    }

    seen.add(input);

    return Object.fromEntries(
      Object.entries(input).map(([entryKey, entryValue]) => [entryKey, scrub(entryValue, entryKey)])
    );
  };

  return scrub(value) as T;
}

export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getHeaderValue(
  headersOrRequest?: Headers | Request | null,
  headerName?: string
): string | null {
  if (!headersOrRequest || !headerName) {
    return null;
  }

  const headers = headersOrRequest instanceof Request
    ? headersOrRequest.headers
    : isHeadersLike(headersOrRequest)
      ? headersOrRequest
      : null;

  return headers?.get(headerName) ?? null;
}

export function getRequestId(headersOrRequest?: Headers | Request | null): string {
  return getHeaderValue(headersOrRequest, REQUEST_ID_HEADER) ?? createRequestId();
}

export function getMerchantId(headersOrRequest?: Headers | Request | null): string | null {
  return getHeaderValue(headersOrRequest, MERCHANT_ID_HEADER);
}

function emit(level: LogLevel, entry: Record<string, unknown>) {
  const method = level === 'debug'
    ? console.debug
    : level === 'info'
      ? console.info
      : level === 'warn'
        ? console.warn
        : console.error;

  method(JSON.stringify(redactSensitiveData(entry)));
}

export function createLogger(context: LogContext = {}) {
  const baseContext = redactSensitiveData(context);

  const log = (level: LogLevel, message: string, extra?: Record<string, unknown>) => {
    emit(level, {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseContext,
      ...(extra ? redactSensitiveData(extra) : {}),
    });
  };

  return {
    child(extra: LogContext) {
      return createLogger({ ...baseContext, ...extra });
    },
    debug(message: string, extra?: Record<string, unknown>) {
      log('debug', message, extra);
    },
    info(message: string, extra?: Record<string, unknown>) {
      log('info', message, extra);
    },
    warn(message: string, extra?: Record<string, unknown>) {
      log('warn', message, extra);
    },
    error(message: string, extra?: Record<string, unknown>) {
      log('error', message, extra);
    },
  };
}

export function createRequestLogger(request: Request, route: string) {
  return createLogger({
    requestId: getRequestId(request),
    merchantId: getMerchantId(request),
    route,
    method: request.method,
  });
}

export function withRequestLogging<TArgs extends [Request, ...unknown[]]>(
  route: string,
  handler: RouteHandler<TArgs>
) {
  return async (...args: TArgs): Promise<Response> => {
    const request = isRequestLike(args[0])
      ? args[0]
      : new Request(`http://localhost${route}`);
    const requestId = getRequestId(request);
    const merchantId = getMerchantId(request);
    const logger = createLogger({
      requestId,
      merchantId,
      route,
      method: request.method,
    });
    const startedAt = Date.now();

    try {
      const response = await handler(...args);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      logger.info('request.complete', {
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      const { captureServerException } = await import('@/lib/sentry');
      captureServerException(error, {
        requestId,
        merchantId,
        route,
        method: request.method,
      });

      logger.error('request.error', {
        status: 500,
        durationMs: Date.now() - startedAt,
        error,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        {
          status: 500,
          headers: {
            [REQUEST_ID_HEADER]: requestId,
          },
        }
      );
    }
  };
}

export const requestIdHeader = REQUEST_ID_HEADER;
export const merchantIdHeader = MERCHANT_ID_HEADER;
