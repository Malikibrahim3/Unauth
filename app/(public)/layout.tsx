/**
 * app/(public)/layout.tsx
 *
 * Minimal layout for public pages (legal, demo) — no auth required.
 */
import { PublicRoot } from '@/components/public/PublicUI';
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicRoot>{children}</PublicRoot>;
}
