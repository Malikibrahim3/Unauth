import { redirect } from 'next/navigation';

/**
 * Legacy top-level Integrations Hub. The canonical integration surface is
 * /settings/integrations (linked from the sidebar and every "connect" CTA).
 * This route is retained as a redirect so existing bookmarks / Gorgias widget
 * deep-links keep working without showing a duplicate hub.
 */
export default function IntegrationsHubRedirect() {
  redirect('/settings/integrations');
}
