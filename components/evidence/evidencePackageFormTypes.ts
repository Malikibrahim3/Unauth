export interface OrderOption {
  id: string;
  order_id: string;
  processed_at: string;
  order_value: number | null;
  currency: string | null;
  source: string | null;
  source_name: string | null;
  source_account_id: string | null;
  immutable_id: string;
  source_updated_at: string | null;
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
  caseContextId?: string;
  syncOrderToUrl?: boolean;
  showIntro?: boolean;
  onCancel?: () => void;
  onSuccess?: (packageId: string) => void;
  acceptanceState?: 'no-orders' | 'no-cases';
}

export type PackageIncludeItem = {
  label: string;
  available: boolean;
  pending?: boolean;
  optional?: boolean;
  source: string;
  freshness: string;
  packEffect: string;
  repairHref?: string;
};
