export type RedirectSearchParams = Record<string, string | string[] | undefined>;

/**
 * Rebuild a same-origin redirect without silently dropping source context.
 * Callers may consume or override route-control keys while all other query
 * parameters keep their original order and repeated values.
 */
export function preservedRedirectTarget(
  pathname: string,
  searchParams: RedirectSearchParams | undefined,
  options: {
    consume?: readonly string[];
    force?: Readonly<Record<string, string>>;
    hash?: string;
  } = {},
): string {
  const consumed = new Set(options.consume ?? []);
  const result = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(searchParams ?? {})) {
    if (consumed.has(key) || Object.hasOwn(options.force ?? {}, key)) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== undefined) result.append(key, value);
    }
  }

  for (const [key, value] of Object.entries(options.force ?? {})) {
    result.set(key, value);
  }

  const query = result.toString();
  const normalizedHash = options.hash
    ? `#${options.hash.replace(/^#/, '')}`
    : '';
  return `${pathname}${query ? `?${query}` : ''}${normalizedHash}`;
}
