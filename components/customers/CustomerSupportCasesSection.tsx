'use client';

import { useEffect, useState } from 'react';
import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import { SectionCard } from '@/components/ui/SectionCard';
import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';

export default function CustomerSupportCasesSection({ profileId }: { profileId: string }) {
  const [cases, setCases] = useState<PublicSupportCaseContext[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/customers/${encodeURIComponent(profileId)}/support-cases`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) {
          setCases(payload?.support_cases ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return (
    <SectionCard
      title="Support cases"
      description="Tickets and support conversations linked to this customer or their orders."
    >
      {!loaded ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading support cases…
        </p>
      ) : (
        <SupportCaseContextList
          bare
          cases={cases}
          emptyMessage="No linked support cases yet."
        />
      )}
    </SectionCard>
  );
}
