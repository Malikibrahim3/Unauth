/**
 * SSRF guard for outbound requests whose host is derived from merchant-supplied
 * input (e.g. a WooCommerce store URL). Blocks loopback, private, link-local,
 * and reserved address ranges plus obvious internal names so a merchant cannot
 * point an integration at internal infrastructure (cloud metadata, admin
 * services, etc.).
 *
 * LIMITATION: this validates the literal hostname only. It does NOT defend
 * against DNS rebinding (a public name that resolves to a private IP). Full
 * protection requires resolving the host and re-checking the IP at connect time
 * with a pinned fetch — tracked as a follow-up.
 */

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^0\./, // "this" network
  /^10\./, // private
  /^127\./, // loopback
  /^169\.254\./, // link-local (incl. cloud metadata 169.254.169.254)
  /^172\.(1[6-9]|2\d|3[01])\./, // private
  /^192\.168\./, // private
  /^192\.0\.0\./, // IETF protocol assignments
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // carrier-grade NAT 100.64/10
];

function isPrivateIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return PRIVATE_IPV4_PATTERNS.some((re) => re.test(host));
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (h === '::1' || h === '::') return true; // loopback / unspecified
  if (h.startsWith('fe80:')) return true; // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique-local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = h.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return true;
  if (isPrivateIpv4(h)) return true;
  if (h.includes(':') || h.startsWith('[')) return isPrivateIpv6(h);
  // Single-label host (no dot, not an IP) — cannot be a public FQDN; likely
  // resolves via internal DNS/search domains.
  if (!h.includes('.')) return true;
  return false;
}

/** Throws `ssrf_blocked_hostname` if the host is not a safe public target. */
export function assertPublicHostname(hostname: string): void {
  if (isBlockedHostname(hostname)) {
    throw new Error('ssrf_blocked_hostname');
  }
}
