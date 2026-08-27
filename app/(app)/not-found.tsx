'use client';

import { usePathname } from 'next/navigation';
import { ButtonLink, EmptyState, PageFrame, Surface } from '@/components/ui';

export default function AppNotFound() {
  const pathname = usePathname();
  return (
    <PageFrame
      surfaceId="authenticated-not-found"
      archetype="P12"
      title="This workspace page is unavailable"
      subtitle="Unauth could not match the requested address to a page in the current workspace. Your selected workspace and saved records are unchanged."
      meta={<span>Requested route · <code>{pathname}</code></span>}
    >
      <Surface structure="working" as="section" data-state-id="authenticated-not-found">
        <EmptyState
          title="The destination could not be opened"
          description="This state does not tell us whether the address changed, the record is unavailable, or access is restricted. Return to a known workspace page and reopen the item from there."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href="/overview" variant="primary">Return to Overview</ButtonLink>
              <ButtonLink href="/cases" variant="secondary">Open Cases</ButtonLink>
              <ButtonLink href="/help?q=unavailable" variant="link">Get recovery help</ButtonLink>
            </div>
          }
        />
      </Surface>
    </PageFrame>
  );
}
