import { PageFrame } from '@/components/ui/PageFrame';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import { Bone } from '@/components/ui/LoadingSkeleton';

export default function CustomerEvidenceLoading() {
  return (
    <PageFrame title="Build evidence package" subtitle="Loading customer evidence workspace…" surfaceId="build-evidence-package" archetype="P8">
      <div data-state-id="evidence-package-builder-loading"><AuthenticatedPanel><div className="space-y-4 p-1"><Bone className="h-5 w-52" /><Bone className="h-4 w-full max-w-2xl" /><div className="grid gap-3 border-t border-[var(--uo-route-border-subtle)] pt-4 sm:grid-cols-2"><Bone className="h-10" /><Bone className="h-10" /></div><Bone className="h-36 w-full" /></div></AuthenticatedPanel></div>
    </PageFrame>
  );
}
