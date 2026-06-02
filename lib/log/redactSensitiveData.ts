const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|refresh[-_]?token|session|email|e-mail|ip|ipAddress|address|line1|line2|street|city|postcode|postal|zip|phone|ssn|dob)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const IPV6_PATTERN = /\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9:]{1,4}\b/i;

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
      Object.entries(input).map(([entryKey, entryValue]) => [entryKey, scrub(entryValue, entryKey)]),
    );
  };

  return scrub(value) as T;
}
