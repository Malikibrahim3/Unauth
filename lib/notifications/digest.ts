import type { NotificationListItem } from '@/lib/notifications/store';

export type DigestPreview = {
  subject: string;
  generatedAt: string;
  deliveryEnabled: false;
  notificationCount: number;
  unreadCount: number;
  bodyText: string;
  items: Array<{ id: string; kind: string; title: string; body: string | null; href: string; createdAt: string }>;
};

/**
 * The same deterministic renderer used for a future digest delivery. Preview
 * callers receive the rendered content, but this function never sends mail,
 * emits a domain event, or calls a provider.
 */
export function renderDigestPreview(items: NotificationListItem[], now = new Date()): DigestPreview {
  const projected = items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    href: item.target_href,
    createdAt: item.created_at,
  }));
  const unreadCount = items.filter((item) => item.read_at == null).length;
  const bodyText = projected.length
    ? projected.map((item, index) => `${index + 1}. ${item.title}${item.body ? ` — ${item.body}` : ''}`).join('\n')
    : 'No notifications are available in this preview. Nothing is scheduled or sent.';
  return {
    subject: unreadCount ? `${unreadCount} Unauth workspace update${unreadCount === 1 ? '' : 's'}` : 'Unauth workspace digest',
    generatedAt: now.toISOString(),
    deliveryEnabled: false,
    notificationCount: projected.length,
    unreadCount,
    bodyText,
    items: projected,
  };
}
