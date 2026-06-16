import type { ReactNode } from 'react';
import type { DataQualityReport } from '@/lib/types/dataQuality';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];
type TxRow = Database['public']['Tables']['audit_transactions']['Row'];

export type CustomerRollup = [string, { maxScore: number; orderCount: number; totalSpend: number }];

export type AuditRunPageViewProps = {
  runData: RunRow;
  jobId: string;
  statusBadge: ReactNode;
  summary: {
    flaggedTransactions: number;
    linkedClusters: number;
  };
  gradeCounts: { definite: number; probable: number; possible: number; weak: number };
  networkLinkedCount: number;
  dataQuality: DataQualityReport | null;
  defaultTab: string;
  hasFlags: boolean;
  isRunComplete: boolean;
  allCustomers: CustomerRollup[];
  customerPage: number;
  txPage: number;
  customerPageSize: number;
  txPageSize: number;
  customerOffset: number;
  totalCustomers: number;
  customerPages: number;
  pagedCustomers: CustomerRollup[];
  selectedCustomerEmail: string | null;
  totalTransactions: number;
  txPages: number;
  transactions: TxRow[] | null;
  crossMerchantTxIds: Set<string>;
  valueAtRisk: number;
  estimatedExposure: number;
};

export type { RunRow, TxRow };
