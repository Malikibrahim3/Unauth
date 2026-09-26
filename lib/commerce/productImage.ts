/** Use only an image retained with this exact order line; never infer one from its title or SKU. */
export function productImageFromMetadata(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  const nested = metadata.image && typeof metadata.image === 'object' && !Array.isArray(metadata.image)
    ? metadata.image as Record<string, unknown> : null;
  const candidate = metadata.image_url ?? nested?.src;
  if (typeof candidate !== 'string' || candidate.length > 2048) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!url.hostname.includes('.') || /^(localhost|.*\.local|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) return null;
    if ([...url.searchParams.keys()].some(key => /token|secret|signature|password|auth|key/i.test(key))) return null;
    return url.toString();
  } catch {
    return null;
  }
}
