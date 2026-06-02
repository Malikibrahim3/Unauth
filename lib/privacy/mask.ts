export function maskEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const [local, domain] = value.split('@');
  if (!domain) return 'masked';
  const [domainName, ...suffixParts] = domain.split('.');
  const suffix = suffixParts.at(-1);
  const maskedDomain = suffix
    ? `${domainName.slice(0, 1)}***.${suffix}`
    : `${domain.slice(0, 1)}***`;
  return `${local.slice(0, 2)}${local.length > 2 ? '***' : '*'}@${maskedDomain}`;
}

export function maskName(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0] ?? ''}${part.length > 1 ? '***' : ''}`)
    .join(' ');
}

export function maskAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(',').flatMap((part) => { const v = part.trim(); return v ? [v] : []; });
  return parts.length > 1 ? `masked address, ${parts.at(-1)}` : 'masked address';
}

export function maskIdentifier(value: string | null | undefined, visible = 4): string | null {
  if (!value) return null;
  return value.length <= visible ? '*'.repeat(value.length) : `***${value.slice(-visible)}`;
}
