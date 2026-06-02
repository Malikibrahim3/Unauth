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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function BuildEvidencePackageTrigger({
  profileId,
  preselectedOrderId,
  disabled = false,
  title,
  className,
  style,
  open: openProp,
  onOpenChange,
  children,
}: BuildEvidencePackageTriggerProps) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = openProp ?? openUncontrolled;
  const setOpen = onOpenChange ?? setOpenUncontrolled;

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
