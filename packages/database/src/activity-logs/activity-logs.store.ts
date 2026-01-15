import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldPath } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { ActivityLogCreateInput, ActivityLogModel } from './activity-log.model';
import { makeActivityCursor, parseActivityCursor } from './activity-log.cursor';

type ActivityLogDoc = Omit<ActivityLogModel, 'id' | 'boardId'>;

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class ActivityLogsStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private col(boardId: string) {
    // boards/{boardId}/activityLogs/{activityId}
    return this.db.collection('boards').doc(boardId).collection('activityLogs');
  }

  async create(boardId: string, input: ActivityLogCreateInput): Promise<ActivityLogModel> {
    const createdAtMs = Date.now();
    const createdAt = nowIso();
    const ref = this.col(boardId).doc();

    const doc: ActivityLogDoc = {
      ticketId: input.ticketId ?? null,
      type: input.type,
      actorId: input.actorId ?? null,
      data: input.data ?? {},
      createdAt,
      createdAtMs,
    };

    await ref.create(doc);
    return { id: ref.id, boardId, ...doc };
  }

  async listForBoard(
    boardId: string,
    input: { limit: number; cursor?: string | null; includeTickets?: boolean },
  ): Promise<{ items: ActivityLogModel[]; nextCursor: string | null }> {
    const limit = Math.max(1, Math.min(50, Math.floor(input.limit)));

    let q = this.col(boardId).orderBy('createdAtMs', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (input.includeTickets === false) {
      q = q.where('ticketId', '==', null) as typeof q;
    }

    const parsed = input.cursor ? parseActivityCursor(input.cursor) : null;
    if (parsed) {
      q = q.startAfter(parsed.createdAtMs, parsed.id) as typeof q;
    }

    const snap = await q.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);
    const items = docs.map((d) => {
      const data = d.data() as Partial<ActivityLogDoc>;
      return {
        id: d.id,
        boardId,
        ticketId: (data.ticketId as string | null | undefined) ?? null,
        type: data.type as ActivityLogModel['type'],
        actorId: (data.actorId as string | null | undefined) ?? null,
        data: (data.data as Record<string, unknown> | undefined) ?? {},
        createdAt: String(data.createdAt ?? ''),
        createdAtMs: Number.isFinite(data.createdAtMs) ? (data.createdAtMs as number) : 0,
      } satisfies ActivityLogModel;
    });

    const hasMore = snap.docs.length > limit;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? makeActivityCursor(last.createdAtMs, last.id) : null;

    return { items, nextCursor };
  }

  async listForTicket(
    boardId: string,
    ticketId: string,
    input: { limit: number; cursor?: string | null },
  ): Promise<{ items: ActivityLogModel[]; nextCursor: string | null }> {
    const limit = Math.max(1, Math.min(50, Math.floor(input.limit)));

    let q = this.col(boardId)
      .where('ticketId', '==', ticketId)
      .orderBy('createdAtMs', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');

    const parsed = input.cursor ? parseActivityCursor(input.cursor) : null;
    if (parsed) {
      q = q.startAfter(parsed.createdAtMs, parsed.id) as typeof q;
    }

    const snap = await q.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);
    const items = docs.map((d) => {
      const data = d.data() as Partial<ActivityLogDoc>;
      return {
        id: d.id,
        boardId,
        ticketId,
        type: data.type as ActivityLogModel['type'],
        actorId: (data.actorId as string | null | undefined) ?? null,
        data: (data.data as Record<string, unknown> | undefined) ?? {},
        createdAt: String(data.createdAt ?? ''),
        createdAtMs: Number.isFinite(data.createdAtMs) ? (data.createdAtMs as number) : 0,
      } satisfies ActivityLogModel;
    });

    const hasMore = snap.docs.length > limit;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? makeActivityCursor(last.createdAtMs, last.id) : null;

    return { items, nextCursor };
  }
}

