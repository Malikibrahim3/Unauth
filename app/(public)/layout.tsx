import '@/styles/authenticated/index.css';
import '@/styles/authenticated/public-light.css';
import '@/styles/evidence-operations.css';

/**
 * app/(public)/layout.tsx
 *
 * Minimal layout for public pages (legal, demo) — no auth required.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="ua-public-route">{children}</div>;
}
