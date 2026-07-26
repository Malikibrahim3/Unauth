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
      aria-label="Integration views"
      value={active}
      items={[
        {
          value: "connected",
          label: <>Connected <span className="ml-1 tabular-nums text-[var(--ua-text-tertiary)]">{connectedCount}</span></>,
          href: "/integrations?view=connected",
        },
        {
          value: "browse",
          label: <>Browse integrations <span className="ml-1 tabular-nums text-[var(--ua-text-tertiary)]">{catalogueCount}</span></>,
          href: "/integrations?view=browse",
        },
        {
          value: "imports",
          label: "Imports & API",
          href: "/integrations/imports",
        },
      ]}
    />
  );
}
