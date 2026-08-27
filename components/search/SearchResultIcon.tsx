import { BriefcaseBusiness, CircleDollarSign, FileText, Package, RotateCcw, Search, ShieldAlert, ShoppingBag, Ticket, Truck, UserRound } from 'lucide-react';
import type { UnifiedResult } from '@/components/layout/commandPaletteReducer';

const ICONS = {
  customer: UserRound,
  order: ShoppingBag,
  case: BriefcaseBusiness,
  ticket: Ticket,
  shipment: Truck,
  refund: RotateCcw,
  return: Package,
  dispute: ShieldAlert,
  loss: CircleDollarSign,
  recovery: FileText,
} satisfies Record<UnifiedResult['type'], typeof Search>;

export function SearchResultIcon({ type, size = 15 }: { type: UnifiedResult['type']; size?: number }) {
  const Icon = ICONS[type] ?? Search;
  return <Icon size={size} aria-hidden="true" />;
}

export function searchTypeLabel(type: UnifiedResult['type']) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
