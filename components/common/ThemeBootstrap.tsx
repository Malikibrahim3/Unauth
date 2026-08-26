/**
 * Theme state is intentionally scoped to the authenticated product root.
 * Public, auth, and onboarding routes must never receive a global colour-mode
 * attribute from the document bootstrap.
 */
export default function ThemeBootstrap() {
  return null;
}
