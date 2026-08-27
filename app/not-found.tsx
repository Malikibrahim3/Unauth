import { ButtonLink } from '@/components/ui';
import { RecoveryShell } from '@/components/system/RecoveryShell';
import '@/styles/operations/index.css';

/*
 * The 404 is a public recovery surface, so it stays inside the white-heavy
 * entry token scope even when an authenticated device has chosen dark mode.
 */
export default function NotFound() {
  return (
    <div
      className="uo-entry ua-public-route min-h-screen"
      style={{ background: 'var(--uo-canvas, #F7F8FA)' }}
    >
      <RecoveryShell
        surfaceId="root-not-found"
        stateId="root-not-found"
        title="Page not found"
        description="This route does not exist or may have moved. Choose a known entry point; no workspace state was changed."
        actions={
          <>
            <ButtonLink href="/landing" variant="primary" size="lg">Back to landing</ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">Sign in</ButtonLink>
          </>
        }
      />
    </div>
  );
}
