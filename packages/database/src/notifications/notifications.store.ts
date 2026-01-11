import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldPath } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { NotificationCreateInput, NotificationModel } from './notification.model';

type NotificationDoc = Omit<NotificationModel, 'id' | 'userId'>;

function nowIso(): string {
  return new Date().toISOString();
}

function parseCursor(cursor: string): { createdAtMs: number; id: string } | null {
  const idx = cursor.indexOf(':');
  if (idx <= 0) return null;
  const ms = Number(cursor.slice(0, idx));
  const id = cursor.slice(idx + 1);
  if (!Number.isFinite(ms) || !id) return null;
  return { createdAtMs: ms, id };
}

function makeCursor(createdAtMs: number, id: string): string {
  return `${createdAtMs}:${id}`;
}

@Injectable()
export class NotificationsStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private col(userId: string) {
    // users/{userId}/notifications/{notificationId}
    return this.db.collection('users').doc(userId).collection('notifications');
  }

  async create(userId: string, input: NotificationCreateInput): Promise<NotificationModel> {
    const createdAtMs = Date.now();
    const createdAt = nowIso();
    const ref = this.col(userId).doc();
    const doc: NotificationDoc = {
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {},
      actorId: input.actorId ?? null,
      createdAt,
      createdAtMs,
      readAt: null,
    };
    await ref.create(doc);
    return { id: ref.id, userId, ...doc };
  }

  async list(
    userId: string,
    input: { limit: number; cursor?: string | null; unreadOnly?: boolean },
  ): Promise<{ items: NotificationModel[]; nextCursor: string | null }> {
    const limit = Math.max(1, Math.min(50, Math.floor(input.limit)));

    let q = this.col(userId).orderBy('createdAtMs', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (input.unreadOnly) {
      q = q.where('readAt', '==', null) as typeof q;
    }

    const parsed = input.cursor ? parseCursor(input.cursor) : null;
    if (parsed) {
      q = q.startAfter(parsed.createdAtMs, parsed.id) as typeof q;
    }

    const snap = await q.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);

    const items = docs.map((d) => {
      const data = d.data() as Partial<NotificationDoc>;
      return {
        id: d.id,
        userId,
        type: data.type as NotificationModel['type'],
        title: String(data.title ?? ''),
        body: (data.body as string | null | undefined) ?? null,
        data: (data.data as Record<string, unknown> | undefined) ?? {},
        actorId: (data.actorId as string | null | undefined) ?? null,
        createdAt: String(data.createdAt ?? ''),
        createdAtMs: Number.isFinite(data.createdAtMs) ? (data.createdAtMs as number) : 0,
        readAt: (data.readAt as string | null | undefined) ?? null,
      } satisfies NotificationModel;
    });

    const hasMore = snap.docs.length > limit;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? makeCursor(last.createdAtMs, last.id) : null;

    return { items, nextCursor };
  }

  async countUnread(userId: string): Promise<number> {
    const snap = await this.col(userId).where('readAt', '==', null).get();
    return snap.size;
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const ref = this.col(userId).doc(notificationId);
    const snap = await ref.get();
    if (!snap.exists) return;
    if ((snap.data() as { readAt?: unknown })?.readAt) return;
    await ref.update({ readAt: nowIso() });
  }

  async markAllRead(userId: string): Promise<void> {
    // Update in chunks to avoid 500 writes per batch limit.
    while (true) {
      const unread = await this.col(userId).where('readAt', '==', null).limit(450).get();
      if (unread.empty) return;
      const now = nowIso();
      const batch = this.db.batch();
      for (const d of unread.docs) {
        batch.update(d.ref, { readAt: now });
      }
      await batch.commit();
    }
  }
}


