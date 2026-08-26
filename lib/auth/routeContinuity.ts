import { safeRedirectPath } from "@/lib/auth/safeRedirect";

export const AUTH_RETURN_COOKIE = "ua-auth-return-to";

export function authReturnPath(candidate: string | null | undefined): string {
  if (!candidate) return safeRedirectPath(candidate);
  try {
    return safeRedirectPath(decodeURIComponent(candidate));
  } catch {
    return safeRedirectPath(candidate);
  }
}

export function loginHrefForReturnPath(candidate: string | null | undefined): string {
  const path = authReturnPath(candidate);
  return `/login?next=${encodeURIComponent(path)}`;
}
