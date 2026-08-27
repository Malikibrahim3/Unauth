'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AuthErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="ua-auth-card" role="alert" data-state-id="auth-route-error">
      <header><div><h1>Account access could not load</h1><p>Your credentials and workspace have not been changed.</p></div></header>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>Try again</Button>
        <Link className="ua-button ua-button--secondary" href="/landing">Return to product overview</Link>
      </div>
    </section>
  );
}
