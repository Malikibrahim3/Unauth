import { redirect } from "next/navigation";
import {
  hasPermission,
  PERMISSIONS,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { TABLES } from "@/lib/supabase/tables";
import {
  FlowsIndexClient,
  type FlowIndexRecord,
} from "@/components/rules/FlowsIndexClient";
import { PageFrame } from "@/components/ui";
import { env } from '@/lib/utils/env';

export const dynamic = "force-dynamic";

type FlowRow = {
  id: string;
  name: string;
  description: string | null;
  trigger_event_type: string;
  active: boolean;
  version: number;
  status: string;
  outputs: unknown[] | null;
  updated_at: string;
};

export default async function FlowsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const [rowsResult, canManage] = await Promise.all([
    service
      .from(TABLES.WORKFLOW_DEFINITIONS)
      .select(
        "id,name,description,trigger_event_type,active,version,status,outputs,updated_at",
      )
      .eq("merchant_id", ctx.merchantId)
      .order("name")
      .order("version", { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const families = new Map<string, FlowRow[]>();
  for (const row of (rowsResult.data ?? []) as FlowRow[])
    families.set(row.name, [...(families.get(row.name) ?? []), row]);
  const flows: FlowIndexRecord[] = [...families.entries()].map(
    ([name, family]) => {
      const rows = family ?? [];
      const draft = rows.find((row: FlowRow) => row.status === "draft");
      const published = rows.find((row: FlowRow) => row.status === "published");
      const display = draft ?? published ?? rows[0]!;
      return {
        name,
        description: display.description,
        hrefId: display.id,
        trigger: display.trigger_event_type,
        status: display.status as FlowIndexRecord["status"],
        active: published?.active ?? false,
        version: display.version,
        publishedVersion: published?.version ?? null,
        hasDraft: Boolean(draft),
        actionCount: Array.isArray(display.outputs)
          ? display.outputs.length
          : 0,
        updatedAt: display.updated_at,
      };
    },
  );
  const publicationEnabled = env.WORKFLOW_PUBLICATION_ENABLED === 'true';
  return (
    <PageFrame
      title="Flows"
      subtitle="Create, test, publish, and pause bounded workflow actions."
    >
        <FlowsIndexClient
          flows={flows}
          canManage={canManage}
          publicationEnabled={publicationEnabled}
        />
    </PageFrame>
  );
}
