/**
 * Object identity for display (WS0.3).
 *
 * UUIDs and seed slugs are storage keys, not names — they must never reach the
 * DOM. Objects are shown as their human reference (e.g. "ELARA-07402") when one
 * exists, otherwise a short derived handle ("Case #A1B2C" / "#A1B2C") derived
 * from the last 5 characters of the id. When no source ref exists that is a
 * data task, not something we paper over by printing the slug.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A value that is a storage key (UUID / seed / smoke / demo slug), not a name. */
function isStorageKey(value: string): boolean {
  return UUID_RE.test(value) || /^(seed|smoke|demo)[-_]/i.test(value);
}

/** Short derived handle from an id — "#A1B2C" (last 5 chars, uppercased, dashes stripped). */
export function hashId(id?: string | null): string {
  const basis = (id ?? '').replace(/[^0-9a-z]/gi, '');
  const tail = basis.slice(-5).toUpperCase();
  return tail ? `#${tail}` : '#—';
}

/**
 * Prefer a human source reference (e.g. "ELARA-07402"); otherwise derive a
 * "Case #A1B2C" handle from the id. Never returns a slug or UUID.
 */
export function shortRef(ref?: string | null, id?: string): string {
  if (ref && !isStorageKey(ref)) return ref;
  const handle = hashId(id);
  return handle === '#—' ? 'Case' : `Case ${handle}`;
}

/** "Leah Patel · ELARA-07402" — falls back to the ref alone when no usable name. */
export function caseDisplay(c: {
  customer_name?: string | null;
  ref?: string | null;
  id: string;
}): string {
  const ref = shortRef(c.ref, c.id);
  const name =
    c.customer_name && !isStorageKey(c.customer_name) ? c.customer_name.trim() : null;
  return name ? `${name} · ${ref}` : ref;
}
