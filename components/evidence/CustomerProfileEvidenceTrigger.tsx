'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BuildEvidencePackageTrigger } from '@/components/evidence/BuildEvidencePackageTrigger';

interface CustomerProfileEvidenceTriggerProps {
  profileId: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

function CustomerProfileEvidenceTriggerInner({
  profileId,
  disabled = false,
  title,
  className,
  style,
  children,
}: CustomerProfileEvidenceTriggerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const disputedOrderFromUrl = searchParams.get('disputedOrder') ?? undefined;
  const shouldOpenFromUrl = searchParams.get('buildEvidence') === '1';

  const [open, setOpen] = useState(shouldOpenFromUrl);

  useEffect(() => {
    if (shouldOpenFromUrl) setOpen(true);
  }, [shouldOpenFromUrl]);

  function clearEvidenceQueryParams() {
    if (!shouldOpenFromUrl && !disputedOrderFromUrl) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('buildEvidence');
    next.delete('disputedOrder');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleClose() {
    setOpen(false);
    clearEvidenceQueryParams();
  }

  return (
    <BuildEvidencePackageTrigger
      profileId={profileId}
      preselectedOrderId={disputedOrderFromUrl}
      disabled={disabled}
      title={title}
      className={className}
      style={style}
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : handleClose())}
    >
      {children}
    </BuildEvidencePackageTrigger>
  );
}

/** Opens the evidence drawer; honours `?buildEvidence=1` and `?disputedOrder=` on the profile URL. */
export function CustomerProfileEvidenceTrigger(props: CustomerProfileEvidenceTriggerProps) {
  return (
    <Suspense fallback={null}>
      <CustomerProfileEvidenceTriggerInner {...props} />
    </Suspense>
  );
}
