import { createHmac } from 'node:crypto';

export function hashIdentifier(value: string): string {
  const salt = process.env.IDENTITY_SALT;
  if (!salt) throw new Error('IDENTITY_SALT environment variable is not set');
  return createHmac('sha256', salt).update(value).digest('hex');
}

export function normaliseEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return lower;

  let normLocal = local;

  if (domain === 'gmail.com') {
    normLocal = normLocal.replace(/\./g, '');
  }

  normLocal = normLocal.split('+')[0];

  return `${normLocal}@${domain}`;
}

export function normaliseAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\bst\b/g, 'street')
    .replace(/\brd\b/g, 'road')
    .replace(/\bave?\b/g, 'avenue')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\bln\b/g, 'lane')
    .replace(/\bct\b/g, 'court')
    .replace(/\bbl?v?d\b/g, 'boulevard')
    .replace(/\bpl\b/g, 'place')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalisePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  // Too short to be a real phone number
  if (digits.length < 7) return null;

  // For entity-matching purposes we use the last 10 digits as a canonical
  // local number. This is stable across +44 7xxx, 07xxx, +1 (xxx), (xxx)-xxx,
  // +61 4xxx, etc. — the suffix is identical regardless of country prefix.
  // Full E.164 reconstruction is not needed because we only compare the value
  // against other values normalised the same way.
  const canonical = digits.slice(-10);
  return canonical;
}
