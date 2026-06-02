import { hashIdentifier } from '@/lib/identity/hash';
import { normalisePhone } from '@/lib/identity/normalise';

export type ProfileIdentityArrays = {
  emails?: string[];
  phones?: string[];
  addresses?: string[];
  card_last4s?: string[];
  ips?: string[];
};

export type ProfileHashArrays = {
  email_hashes: string[];
  phone_hashes: string[];
  address_hashes: string[];
  card_hashes: string[];
  ip_hashes: string[];
};

/** Derive HMAC hash arrays from normalised plaintext identifier arrays on a profile. */
export function buildProfileHashArrays(identifiers: ProfileIdentityArrays): ProfileHashArrays {
  const email_hashes = [
    ...new Set(
      (identifiers.emails ?? []).flatMap((v) =>
        typeof v === 'string' && v.length > 0 ? [hashIdentifier(v)] : [],
      ),
    ),
  ];

  const phone_hashes = [
    ...new Set(
      (identifiers.phones ?? []).flatMap((v) => {
        const normalized = normalisePhone(v);
        return normalized ? [hashIdentifier(normalized)] : [];
      }),
    ),
  ];

  const address_hashes = [
    ...new Set(
      (identifiers.addresses ?? []).flatMap((v) =>
        typeof v === 'string' && v.length > 0 ? [hashIdentifier(v)] : [],
      ),
    ),
  ];

  const card_hashes = [
    ...new Set(
      (identifiers.card_last4s ?? []).flatMap((v) =>
        typeof v === 'string' && v.length > 0 ? [hashIdentifier(v)] : [],
      ),
    ),
  ];

  const ip_hashes = [
    ...new Set(
      (identifiers.ips ?? []).flatMap((v) =>
        typeof v === 'string' && v.length > 0 ? [hashIdentifier(v)] : [],
      ),
    ),
  ];

  return { email_hashes, phone_hashes, address_hashes, card_hashes, ip_hashes };
}

export function withProfileHashArrays<T extends ProfileIdentityArrays>(
  profile: T
): T & ProfileHashArrays {
  return { ...profile, ...buildProfileHashArrays(profile) };
}
