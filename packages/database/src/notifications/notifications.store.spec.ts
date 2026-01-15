import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { NotificationsStore } from './notifications.store';

type Call = { name: string; args: unknown[] };
type FakeDoc = { id: string; data: () => unknown; ref: unknown };
type FakeSnap = { docs: FakeDoc[]; empty: boolean; size: number };

function makeDoc(
  id: string,
  data: unknown = {},
  ref: unknown = { id, path: `users/u1/notifications/${id}` },
): FakeDoc {
  return { id, data: () => data, ref };
}

function makeQuery() {
  const calls: Call[] = [];
  const q = {
    calls,
    orderBy: (...args: unknown[]) => {
      calls.push({ name: 'orderBy', args });
      return q;
    },
    where: (...args: unknown[]) => {
      calls.push({ name: 'where', args });
      return q;
    },
    startAfter: (...args: unknown[]) => {
      calls.push({ name: 'startAfter', args });
      return q;
    },
    limit: (...args: unknown[]) => {
      calls.push({ name: 'limit', args });
      return q;
    },
    get: vi.fn<() => Promise<FakeSnap>>(),
    doc: (_id?: string) => {
      throw new Error('doc() not implemented on query mock');
    },
  };
  return q;
}

function makeDbWithNotificationsQuery(input: {
  q: ReturnType<typeof makeQuery>;
  batchFactory?: () => { update: (ref: unknown, data: unknown) => void; commit: () => Promise<void> };
}) {
  return {
    collection: (name: string) => {
      if (name !== 'users') throw new Error(`unexpected collection: ${name}`);
      return {
        doc: (_userId: string) => ({
          collection: (sub: string) => {
            if (sub !== 'notifications') throw new Error(`unexpected subcollection: ${sub}`);
            return input.q;
          },
        }),
      };
    },
    batch: vi.fn(() => input.batchFactory?.() ?? { update: () => undefined, commit: async () => undefined }),
  };
}

describe('NotificationsStore', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('list clamps limit to [1..50] and uses limit+1 (pagination probe)', async () => {
    const q = makeQuery();
    q.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
    const db = makeDbWithNotificationsQuery({ q });
    const store = new NotificationsStore(db as unknown as Firestore);

    await store.list('u1', { limit: 0 });
    expect(q.calls.find((c) => c.name === 'limit')?.args[0]).toBe(2); // 1 + 1

    q.calls.length = 0;
    q.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
    await store.list('u1', { limit: 999 });
    expect(q.calls.find((c) => c.name === 'limit')?.args[0]).toBe(51); // 50 + 1
  });

  it('list applies unreadOnly filter when requested', async () => {
    const q = makeQuery();
    q.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
    const db = makeDbWithNotificationsQuery({ q });
    const store = new NotificationsStore(db as unknown as Firestore);

    await store.list('u1', { limit: 10, unreadOnly: true });
    expect(q.calls.some((c) => c.name === 'where' && c.args[0] === 'readAt')).toBe(true);
  });

  it('list uses startAfter only when cursor is valid', async () => {
    const q = makeQuery();
    q.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
    const db = makeDbWithNotificationsQuery({ q });
    const store = new NotificationsStore(db as unknown as Firestore);

    await store.list('u1', { limit: 10, cursor: '100:abc' });
    expect(q.calls.some((c) => c.name === 'startAfter' && c.args[0] === 100 && c.args[1] === 'abc')).toBe(
      true,
    );

    q.calls.length = 0;
    q.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
    await store.list('u1', { limit: 10, cursor: 'bad' });
    expect(q.calls.some((c) => c.name === 'startAfter')).toBe(false);
  });

  it('list returns nextCursor when there are more items than limit', async () => {
    const q = makeQuery();
    q.get.mockResolvedValueOnce({
      docs: [
        makeDoc('n3', { type: 'x', title: 't', createdAt: 'iso', createdAtMs: 300, readAt: null }),
        makeDoc('n2', { type: 'x', title: 't', createdAt: 'iso', createdAtMs: 200, readAt: null }),
        makeDoc('n1', { type: 'x', title: 't', createdAt: 'iso', createdAtMs: 100, readAt: null }), // extra -> hasMore
      ],
      empty: false,
      size: 3,
    });
    const db = makeDbWithNotificationsQuery({ q });
    const store = new NotificationsStore(db as unknown as Firestore);

    const res = await store.list('u1', { limit: 2 });
    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).toBe('200:n2'); // last item in returned page
  });

  it('markAllRead updates docs in a batch and stops when empty', async () => {
    const q = makeQuery();
    const d1 = makeDoc('a');
    const d2 = makeDoc('b');
    q.get
      .mockResolvedValueOnce({ docs: [d1, d2], empty: false, size: 2 })
      .mockResolvedValueOnce({ docs: [], empty: true, size: 0 });

    const update = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    const db = makeDbWithNotificationsQuery({
      q,
      batchFactory: () => ({ update, commit }),
    });
    const store = new NotificationsStore(db as unknown as Firestore);

    await store.markAllRead('u1');

    expect((db.batch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(q.get).toHaveBeenCalledTimes(2);
  });
});


