import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { TicketReminderCreateInput, TicketReminderModel } from './ticket-reminder.model';

type TicketReminderDoc = {
  userId: string;
  remindAt: string;
  remindAtMs: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  notificationIds: Record<string, string>;
  // Internal locking fields (not exposed in TicketReminderModel)
  claimedAt: string | null;
  claimedAtMs: number | null;
  claimId: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseReminderPath(path: string): { boardId: string; ticketId: string; reminderId: string } | null {
  // Expected: boards/{boardId}/tickets/{ticketId}/reminders/{reminderId}
  const m = /^boards\/([^/]+)\/tickets\/([^/]+)\/reminders\/([^/]+)$/.exec(path);
  if (!m) return null;
  return { boardId: m[1]!, ticketId: m[2]!, reminderId: m[3]! };
}

@Injectable()
export class TicketRemindersStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private col(boardId: string, ticketId: string) {
    return this.db.collection('boards').doc(boardId).collection('tickets').doc(ticketId).collection('reminders');
  }

  async list(boardId: string, ticketId: string, input: { userId?: string }): Promise<TicketReminderModel[]> {
    let q = this.col(boardId, ticketId).orderBy('remindAtMs', 'asc');
    if (input.userId) {
      q = q.where('userId', '==', input.userId) as typeof q;
    }

    const snap = await q.get();
    return snap.docs.map((d) => {
      const data = d.data() as Partial<TicketReminderDoc>;
      return {
        id: d.id,
        boardId,
        ticketId,
        userId: String(data.userId ?? ''),
        remindAt: String(data.remindAt ?? ''),
        remindAtMs: Number.isFinite(data.remindAtMs) ? (data.remindAtMs as number) : 0,
        createdAt: String(data.createdAt ?? ''),
        updatedAt: String(data.updatedAt ?? ''),
        sentAt: (data.sentAt as string | null | undefined) ?? null,
        notificationIds: (data.notificationIds as Record<string, string> | undefined) ?? {},
      } satisfies TicketReminderModel;
    });
  }

  async get(boardId: string, ticketId: string, reminderId: string): Promise<TicketReminderModel | null> {
    const ref = this.col(boardId, ticketId).doc(reminderId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<TicketReminderDoc>;
    return {
      id: snap.id,
      boardId,
      ticketId,
      userId: String(data.userId ?? ''),
      remindAt: String(data.remindAt ?? ''),
      remindAtMs: Number.isFinite(data.remindAtMs) ? (data.remindAtMs as number) : 0,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
      sentAt: (data.sentAt as string | null | undefined) ?? null,
      notificationIds: (data.notificationIds as Record<string, string> | undefined) ?? {},
    } satisfies TicketReminderModel;
  }

  async create(boardId: string, ticketId: string, input: TicketReminderCreateInput & { remindAtMs: number }): Promise<TicketReminderModel> {
    const now = nowIso();
    const ref = this.col(boardId, ticketId).doc();
    const doc: TicketReminderDoc = {
      userId: input.userId,
      remindAt: input.remindAt,
      remindAtMs: input.remindAtMs,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
      notificationIds: {},
      claimedAt: null,
      claimedAtMs: null,
      claimId: null,
    };
    await ref.create(doc);
    const { claimedAt: _c1, claimedAtMs: _c2, claimId: _c3, ...publicDoc } = doc;
    return { id: ref.id, boardId, ticketId, ...publicDoc };
  }

  async delete(boardId: string, ticketId: string, reminderId: string): Promise<void> {
    await this.col(boardId, ticketId).doc(reminderId).delete();
  }

  async markSent(
    boardId: string,
    ticketId: string,
    reminderId: string,
    patch: { sentAt: string; notificationIds: Record<string, string>; claimId?: string },
  ): Promise<void> {
    const ref = this.col(boardId, ticketId).doc(reminderId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as Partial<TicketReminderDoc>;
      if (data.sentAt) return;
      if (patch.claimId && (data.claimId as string | null | undefined) !== patch.claimId) return;
      tx.update(ref, {
        sentAt: patch.sentAt,
        notificationIds: patch.notificationIds,
        claimedAt: null,
        claimedAtMs: null,
        claimId: null,
        updatedAt: nowIso(),
      } satisfies Partial<TicketReminderDoc>);
    });
  }

  async releaseClaim(boardId: string, ticketId: string, reminderId: string, claimId: string): Promise<void> {
    const ref = this.col(boardId, ticketId).doc(reminderId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as Partial<TicketReminderDoc>;
      if (data.sentAt) return;
      if ((data.claimId as string | null | undefined) !== claimId) return;
      tx.update(ref, { claimedAt: null, claimedAtMs: null, claimId: null, updatedAt: nowIso() } satisfies Partial<TicketReminderDoc>);
    });
  }

  async claimDue(
    nowMs: number,
    input: { limit?: number; claimId: string; claimTtlMs?: number },
  ): Promise<Array<Pick<TicketReminderModel, 'id' | 'boardId' | 'ticketId' | 'userId' | 'remindAt' | 'remindAtMs'>>> {
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 200)));
    const claimTtlMs = Math.max(1_000, Math.floor(input.claimTtlMs ?? 5 * 60_000));

    const q = this.db
      .collectionGroup('reminders')
      .where('sentAt', '==', null)
      .where('remindAtMs', '<=', nowMs)
      .orderBy('remindAtMs', 'asc')
      .limit(limit);

    const snap = await q.get();
    const out: Array<Pick<TicketReminderModel, 'id' | 'boardId' | 'ticketId' | 'userId' | 'remindAt' | 'remindAtMs'>> = [];

    for (const d of snap.docs) {
      const parsed = parseReminderPath(d.ref.path);
      if (!parsed) continue;
      const ref = d.ref;

      let claimed = false;
      await this.db.runTransaction(async (tx) => {
        const cur = await tx.get(ref);
        if (!cur.exists) return;
        const data = cur.data() as Partial<TicketReminderDoc>;
        if (data.sentAt) return;
        const claimedAtMs = (data.claimedAtMs as number | null | undefined) ?? null;
        const claimId = (data.claimId as string | null | undefined) ?? null;
        const claimFresh = typeof claimedAtMs === 'number' && Number.isFinite(claimedAtMs) && nowMs - claimedAtMs < claimTtlMs;
        if (claimFresh && claimId && claimId !== input.claimId) return;

        tx.update(ref, {
          claimedAt: nowIso(),
          claimedAtMs: nowMs,
          claimId: input.claimId,
          updatedAt: nowIso(),
        } satisfies Partial<TicketReminderDoc>);
        claimed = true;
      });

      if (!claimed) continue;

      const data = d.data() as Partial<TicketReminderDoc>;
      out.push({
        id: parsed.reminderId,
        boardId: parsed.boardId,
        ticketId: parsed.ticketId,
        userId: String(data.userId ?? ''),
        remindAt: String(data.remindAt ?? ''),
        remindAtMs: Number.isFinite(data.remindAtMs) ? (data.remindAtMs as number) : 0,
      });
    }

    return out;
  }

  async listDue(nowMs: number, input?: { limit?: number }): Promise<
    Array<
      Pick<TicketReminderModel, 'id' | 'boardId' | 'ticketId' | 'userId' | 'remindAt' | 'remindAtMs' | 'sentAt' | 'notificationIds'>
    >
  > {
    const limit = Math.max(1, Math.min(500, Math.floor(input?.limit ?? 200)));
    const q = this.db
      .collectionGroup('reminders')
      .where('sentAt', '==', null)
      .where('remindAtMs', '<=', nowMs)
      .orderBy('remindAtMs', 'asc')
      .limit(limit);

    const snap = await q.get();
    const out: Array<
      Pick<TicketReminderModel, 'id' | 'boardId' | 'ticketId' | 'userId' | 'remindAt' | 'remindAtMs' | 'sentAt' | 'notificationIds'>
    > = [];

    for (const d of snap.docs) {
      const parsed = parseReminderPath(d.ref.path);
      if (!parsed) continue;
      const data = d.data() as Partial<TicketReminderDoc>;
      out.push({
        id: parsed.reminderId,
        boardId: parsed.boardId,
        ticketId: parsed.ticketId,
        userId: String(data.userId ?? ''),
        remindAt: String(data.remindAt ?? ''),
        remindAtMs: Number.isFinite(data.remindAtMs) ? (data.remindAtMs as number) : 0,
        sentAt: (data.sentAt as string | null | undefined) ?? null,
        notificationIds: (data.notificationIds as Record<string, string> | undefined) ?? {},
      });
    }
    return out;
  }
}

