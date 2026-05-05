/**
 * /audit/[runId]/customers — legacy standalone customers page.
 *
 * This route was replaced by the customers tab on the main audit page
 * (/audit/[runId]?tab=customers). All links inside the app now point to the tab.
 * This file exists purely as a redirect shim so that any bookmarked or
 * externally-linked URLs continue to work.
 *
 * See reports/ui-ux-audit/APP_COHESION_AUDIT.md — Issue F2.
 */
import { redirect } from 'next/navigation';

interface PageProps {
  params: { runId: string };
}

export default function CustomersPageRedirect({ params }: PageProps) {
  redirect(`/audit/${params.runId}?tab=customers`);
}
