import { Tabs } from "@/components/ui/Tabs";
import type { IntegrationsView } from "@/lib/integrations/catalogueView";

export type { IntegrationsView } from "@/lib/integrations/catalogueView";

export function IntegrationsTabs({
  active,
  connectedCount,
  catalogueCount,
}: {
  active: IntegrationsView;
  connectedCount: number;
  catalogueCount: number;
}) {
  return (
    <Tabs
      aria-label="Source views"
      value={active}
      items={[
        {
          value: "connected",
          label: <>Connected <span className="ml-1 tabular-nums text-[var(--uo-route-text-tertiary)]">{connectedCount}</span></>,
          href: "/sources/connected?view=connected",
        },
        {
          value: "browse",
          label: <>Catalogue <span className="ml-1 tabular-nums text-[var(--uo-route-text-tertiary)]">{catalogueCount}</span></>,
          href: "/sources/browse",
        },
        {
          value: "imports",
          label: "Imports",
          href: "/sources/imports",
        },
      ]}
    />
  );
}
