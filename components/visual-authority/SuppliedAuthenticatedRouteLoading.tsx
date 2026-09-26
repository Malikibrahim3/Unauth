'use client';

import { usePathname } from 'next/navigation';
import { useAuthenticatedShellPresentation } from '@/components/layout/BreadcrumbOverrideContext';
import { SuppliedVisualBody as RegistryBody } from './generated/Loading-Registry-Clean';
import { SuppliedVisualBody as DetailBody } from './generated/Loading-Detail-Clean';

const REGISTRY_PRESENTATION = { kind: 'loading-registry' } as const;
const DETAIL_PRESENTATION = { kind: 'loading-detail' } as const;

function isDetailPath(pathname: string) {
  return /^\/(?:cases|customers|orders|refunds|returns|shipments|tickets|disputes)\/[^/]+(?:\/evidence\/new)?$/.test(pathname)
    || /^\/financials\/(?:losses|recovery|reports)\/[^/]+(?:\/records)?$/.test(pathname)
    || /^\/controls\/(?:rules|flows)\/[^/]+$/.test(pathname)
    || /^\/controls\/flows\/runs\/[^/]+$/.test(pathname)
    || /^\/sources\/(?!connected$|browse$|imports$|setup$)[^/]+$/.test(pathname)
    || /^\/sources\/imports\/[^/]+$/.test(pathname)
    || /^\/help\/[^/]+$/.test(pathname);
}

export default function SuppliedAuthenticatedRouteLoading() {
  const pathname = usePathname();
  const detail = isDetailPath(pathname);
  useAuthenticatedShellPresentation(detail ? DETAIL_PRESENTATION : REGISTRY_PRESENTATION);
  return detail ? <DetailBody/> : <RegistryBody/>;
}
