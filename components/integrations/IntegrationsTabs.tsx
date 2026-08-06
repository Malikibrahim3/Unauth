import { Tabs } from "@/components/ui/Tabs";

export type IntegrationsView = "connected" | "browse" | "imports";

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
          label: <>Connected <span className="ml-1 tabular-nums text-[var(--ua-text-tertiary)]">{connectedCount}</span></>,
          href: "/sources/connected?view=connected",
        },
        {
          value: "browse",
          label: <>Browse sources <span className="ml-1 tabular-nums text-[var(--ua-text-tertiary)]">{catalogueCount}</span></>,
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
