export interface OrderOption {
  id: string;
  order_id: string;
  processed_at: string;
  order_value: number | null;
  refund_claimed: boolean;
}

export type OrdersResponse = {
  orders?: OrderOption[];
};

export type Ce3CheckResponse = {
  hasPriorMatchEvidence?: boolean;
};

export type PriorMatchPreview = 'likely' | 'unlikely' | 'unknown';

export interface EvidencePackageFormProps {
  profileId: string;
  preselectedOrderId?: string;
  showIntro?: boolean;
  onCancel?: () => void;
  onSuccess?: (packageId: string) => void;
}

export type PackageIncludeItem = {
  label: string;
  available: boolean;
  pending?: boolean;
  optional?: boolean;
};
