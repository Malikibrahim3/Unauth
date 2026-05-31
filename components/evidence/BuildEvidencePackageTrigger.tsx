'use client';

import { useState, type ReactNode } from 'react';
import { BuildEvidencePackageDrawer } from '@/components/evidence/BuildEvidencePackageDrawer';

interface BuildEvidencePackageTriggerProps {
  profileId: string;
  preselectedOrderId?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function BuildEvidencePackageTrigger({
  profileId,
  preselectedOrderId,
  disabled = false,
  title,
  className,
  style,
  children,
}: BuildEvidencePackageTriggerProps) {
  const [open, setOpen] = useState(false);

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
        onClose={() => setOpen(false)}
        profileId={profileId}
        preselectedOrderId={preselectedOrderId}
      />
    </>
  );
}
