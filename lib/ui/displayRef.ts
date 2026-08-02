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
const SHOPIFY_GID_RE = /^gid:\/\/[^/]+\/([^/]+)\/([^/?#]+)(?:[/?#].*)?$/i;
const OPAQUE_REF_RE = /^(?:gid:\/\/|urn:|https?:\/\/)/i;

/** A value that is a storage key (UUID / seed / smoke / demo slug), not a name. */
function isStorageKey(value: string): boolean {
  return UUID_RE.test(value) || /^(seed|smoke|demo)[-_]/i.test(value);
}

function objectKindLabel(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Record';
}

/**
 * Turn an opaque provider identifier into a compact merchant-facing source
 * reference when it contains a useful terminal handle. Other URLs/URNs remain
 * hidden because they are transport identifiers, not record names.
 */
export function sourceRefLabel(ref?: string | null): string | null {
  const value = ref?.trim();
  if (!value || isStorageKey(value)) return null;

  const shopifyGid = value.match(SHOPIFY_GID_RE);
  if (shopifyGid) {
    const [, kind, rawHandle] = shopifyGid;
    let handle = rawHandle;
    try {
      handle = decodeURIComponent(rawHandle);
    } catch {
      // Keep the provider's literal terminal handle when percent encoding is
      // malformed; the opaque GID itself still never reaches the DOM.
    }
    handle = handle.replace(/^#/, '');
    return `${objectKindLabel(kind)} #${handle}`;
  }

  if (OPAQUE_REF_RE.test(value)) return null;
  return value;
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
  const sourceLabel = sourceRefLabel(ref);
  if (sourceLabel) return sourceLabel;
  const handle = hashId(id);
  return handle === '#—' ? 'Case' : `Case ${handle}`;
}

/**
 * Human identity for a connected record. Provider GIDs and storage keys never
 * reach the DOM; when no useful source reference exists, the canonical object
 * type and a short stable handle keep the record distinguishable.
 */
export function objectDisplayRef(
  type: string,
  ref?: string | null,
  id?: string | null,
): string {
  const sourceLabel = sourceRefLabel(ref);
  const kind = objectKindLabel(type);
  if (sourceLabel) return sourceLabel;
  if (ref?.trim() && isStorageKey(ref.trim())) return `${kind} record`;
  const handle = hashId(id);
  return handle === '#—' ? `${kind} record` : `${kind} ${handle}`;
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
