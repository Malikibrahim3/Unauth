import type { InvestigationTarget } from '@/lib/investigations/types';

export function waitingCaseStatusForTarget(target: InvestigationTarget): string {
  switch (target) {
    case 'carrier':
      return 'awaiting_carrier_response';
    case '3pl':
    case 'warehouse':
      return 'awaiting_3pl_response';
    case 'supplier':
      return 'awaiting_supplier_response';
    case 'customer':
      return 'awaiting_customer_evidence';
    case 'internal':
      return 'manual_review';
  }
}

