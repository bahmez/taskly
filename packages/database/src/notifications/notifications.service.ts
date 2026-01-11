import { Inject, Injectable } from '@nestjs/common';
import type { NotificationCreateInput, NotificationModel } from './notification.model';
import { NotificationsStore } from './notifications.store';

@Injectable()
export class NotificationsService {
  constructor(@Inject(NotificationsStore) private readonly store: NotificationsStore) {}

  create(userId: string, input: NotificationCreateInput): Promise<NotificationModel> {
    return this.store.create(userId, input);
  }

  list(
    userId: string,
    input: { limit: number; cursor?: string | null; unreadOnly?: boolean },
  ): Promise<{ items: NotificationModel[]; nextCursor: string | null }> {
    return this.store.list(userId, input);
  }

  countUnread(userId: string): Promise<number> {
    return this.store.countUnread(userId);
  }

  markRead(userId: string, notificationId: string): Promise<void> {
    return this.store.markRead(userId, notificationId);
  }

  markAllRead(userId: string): Promise<void> {
    return this.store.markAllRead(userId);
  }
}


