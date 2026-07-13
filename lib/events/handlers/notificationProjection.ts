/** Projects typed notification.requested events into recipient-scoped rows. */
import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { projectNotificationFromEvent } from '@/lib/notifications/project';

export const notificationProjection: DomainEventHandler = async (client, event) =>
  projectNotificationFromEvent(client, event as never);
