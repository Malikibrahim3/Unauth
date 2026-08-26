'use client';

import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import { SectionCard } from '@/components/ui/SectionCard';
import type { PublicSupportCaseContext } from '@/lib/support/intake/supportCaseReadModel';
import { useFetchJson } from '@/lib/react/useFetchJson';

type SupportCasesResponse = {
  support_cases?: PublicSupportCaseContext[];
};

export default function CustomerSupportCasesSection({ profileId }: { profileId: string }) {
  const { data, loading } = useFetchJson<SupportCasesResponse>(
    `/api/customers/${encodeURIComponent(profileId)}/support-cases`,
    {
      parse: async (response) => {
        if (!response.ok) return { support_cases: [] };
        return response.json() as Promise<SupportCasesResponse>;
      },
    },
  );
  const cases = data?.support_cases ?? [];

  return (
    <SectionCard
      title="Helpdesk source records"
      description="Helpdesk case records linked to this customer or their orders."
    >
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--uo-route-text-secondary)' }}>
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
