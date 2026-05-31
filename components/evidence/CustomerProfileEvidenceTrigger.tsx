'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BuildEvidencePackageDrawer } from '@/components/evidence/BuildEvidencePackageDrawer';

interface CustomerProfileEvidenceTriggerProps {
  profileId: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

/** Opens the evidence drawer; honours `?buildEvidence=1` and `?disputedOrder=` on the profile URL. */
export function CustomerProfileEvidenceTrigger({
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
    <>
      <button
        type="button"
        disabled={disabled}
        title={title}
        className={className}
        style={style}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <BuildEvidencePackageDrawer
        open={open}
        onClose={handleClose}
        profileId={profileId}
        preselectedOrderId={disputedOrderFromUrl}
      />
    </>
  );
}
