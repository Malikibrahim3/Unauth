/**
 * app/(public)/layout.tsx
 *
 * Minimal layout for public pages (legal, demo) — no auth required.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
