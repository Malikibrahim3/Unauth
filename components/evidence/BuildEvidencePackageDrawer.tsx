'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from '@/components/ui/Drawer';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';

interface BuildEvidencePackageDrawerProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
  preselectedOrderId?: string;
}

export function BuildEvidencePackageDrawer({
  open,
  onClose,
  profileId,
  preselectedOrderId,
}: BuildEvidencePackageDrawerProps) {
  const router = useRouter();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Build evidence package"
      width={520}
      aria-label="Build evidence package"
    >
      <EvidencePackageForm
        profileId={profileId}
        preselectedOrderId={preselectedOrderId}
        showIntro={false}
        onCancel={onClose}
        onSuccess={(packageId) => {
          onClose();
          router.push(`/chargebacks/${packageId}`);
        }}
      />
    </Drawer>
  );
}
