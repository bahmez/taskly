import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { TicketRemindersStore } from './ticket-reminders.store';

describe('TicketRemindersStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  type DocRef = { path: string };
  type TxSnap = { exists: boolean; data: () => unknown };
  type Tx = { get: (ref: DocRef) => Promise<TxSnap>; update: (ref: DocRef, patch: Record<string, unknown>) => void };
  type QueryDoc = { ref: DocRef; data: () => unknown };
  type Query = { where: (...args: unknown[]) => Query; orderBy: (...args: unknown[]) => Query; limit: (n: number) => Query; get: () => Promise<{ docs: QueryDoc[] }> };

  it('create writes a reminder under boards/{boardId}/tickets/{ticketId}/reminders', async () => {
    const create = vi.fn(async () => undefined);
    const doc = vi.fn(() => ({ id: 'r1', create }));
    const collection = vi.fn(() => ({ doc }));
    const ticketDoc = vi.fn(() => ({ collection }));
    const ticketsCol = vi.fn(() => ({ doc: ticketDoc }));
    const boardDoc = vi.fn(() => ({ collection: ticketsCol }));
    const boardsCol = vi.fn(() => ({ doc: boardDoc }));

    const db = {
      collection: (name: string) => {
        if (name !== 'boards') throw new Error(`unexpected collection: ${name}`);
        return boardsCol();
      },
      collectionGroup: () => {
        throw new Error('collectionGroup not used in this test');
      },
    };

    const store = new TicketRemindersStore(db as unknown as Firestore);
    const out = await store.create('b1', 't1', { userId: 'u1', remindAt: '2026-01-02T00:00:00.000Z', remindAtMs: 123 });

    expect(out).toMatchObject({ id: 'r1', boardId: 'b1', ticketId: 't1', userId: 'u1', remindAtMs: 123, sentAt: null, notificationIds: {} });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        remindAt: '2026-01-02T00:00:00.000Z',
        remindAtMs: 123,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        sentAt: null,
        notificationIds: {},
      }),
    );
  });

  it('claimDue claims an unclaimed due reminder (best-effort lock)', async () => {
    const nowMs = 1000;
    const claimId = 'c1';

    const docRef: DocRef = { path: 'boards/b1/tickets/t1/reminders/r1' };
    const docData = new Map<string, Record<string, unknown>>([
      [
        docRef.path,
        {
          userId: 'u1',
          remindAt: '2026-01-01T00:00:00.000Z',
          remindAtMs: 0,
          createdAt: '',
          updatedAt: '',
          sentAt: null,
          notificationIds: {},
          claimedAt: null,
          claimedAtMs: null,
          claimId: null,
        },
      ],
    ]);

    const tx: Tx = {
      get: vi.fn(async (ref: DocRef) => ({ exists: true, data: () => docData.get(ref.path) })),
      update: vi.fn((ref: DocRef, patch: Record<string, unknown>) =>
        docData.set(ref.path, { ...(docData.get(ref.path) ?? {}), ...patch }),
      ),
    };

    const q: Query = {
      where: vi.fn(() => q),
      orderBy: vi.fn(() => q),
      limit: vi.fn(() => q),
      get: vi.fn(async () => ({
        docs: [{ ref: docRef, data: () => docData.get(docRef.path) }],
      })),
    };

    const db = {
      collection: () => {
        throw new Error('not used');
      },
      collectionGroup: vi.fn(() => q),
      runTransaction: vi.fn(async (fn: (t: Tx) => Promise<void>) => await fn(tx)),
    };

    const store = new TicketRemindersStore(db as unknown as Firestore);
    const res = await store.claimDue(nowMs, { claimId, claimTtlMs: 60_000, limit: 10 });
    expect(res).toEqual([{ id: 'r1', boardId: 'b1', ticketId: 't1', userId: 'u1', remindAt: '2026-01-01T00:00:00.000Z', remindAtMs: 0 }]);
    expect(tx.update).toHaveBeenCalledWith(docRef, expect.objectContaining({ claimId, claimedAtMs: nowMs }));
  });

  it('claimDue skips a due reminder already claimed recently by another claimId', async () => {
    const nowMs = 1000;
    const docRef: DocRef = { path: 'boards/b1/tickets/t1/reminders/r1' };
    const docData = new Map<string, Record<string, unknown>>([
      [
        docRef.path,
        {
          userId: 'u1',
          remindAt: '2026-01-01T00:00:00.000Z',
          remindAtMs: 0,
          createdAt: '',
          updatedAt: '',
          sentAt: null,
          notificationIds: {},
          claimedAt: 'x',
          claimedAtMs: nowMs - 10,
          claimId: 'other',
        },
      ],
    ]);

    const tx: Tx = {
      get: vi.fn(async (ref: DocRef) => ({ exists: true, data: () => docData.get(ref.path) })),
      update: vi.fn(),
    };

    const q: Query = {
      where: vi.fn(() => q),
      orderBy: vi.fn(() => q),
      limit: vi.fn(() => q),
      get: vi.fn(async () => ({
        docs: [{ ref: docRef, data: () => docData.get(docRef.path) }],
      })),
    };

    const db = {
      collection: () => {
        throw new Error('not used');
      },
      collectionGroup: vi.fn(() => q),
      runTransaction: vi.fn(async (fn: (t: Tx) => Promise<void>) => await fn(tx)),
    };

    const store = new TicketRemindersStore(db as unknown as Firestore);
    const res = await store.claimDue(nowMs, { claimId: 'mine', claimTtlMs: 60_000, limit: 10 });
    expect(res).toEqual([]);
    expect(tx.update).not.toHaveBeenCalled();
  });
});

