import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { TicketsStore } from './tickets.store';

type DocSnap = {
  id: string;
  exists: boolean;
  data: () => unknown;
  ref: { update: (data: unknown) => Promise<void>; get: () => Promise<DocSnap> };
};

function makeSnap(input: { id: string; exists: boolean; data?: unknown }): DocSnap {
  const snap: DocSnap = {
    id: input.id,
    exists: input.exists,
    data: () => input.data ?? {},
    ref: {
      update: async () => undefined,
      get: async () => snap,
    },
  };
  return snap;
}

describe('TicketsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('getById caches resolved boardId (avoids re-scanning boards)', async () => {
    const ticketId = 't1';
    const foundSnap = makeSnap({
      id: ticketId,
      exists: true,
      data: { isArchived: false, columnId: 'c', title: 'T', description: '', position: 1, createdAt: 'x', updatedAt: 'x' },
    });

    const board1 = {
      id: 'b1',
      collection: (_: string) => ({
        doc: (_id: string) => ({ get: async () => makeSnap({ id: ticketId, exists: false }) }),
      }),
    };
    const board2 = {
      id: 'b2',
      collection: (_: string) => ({
        doc: (_id: string) => ({ get: async () => foundSnap }),
      }),
    };

    const listDocuments = vi.fn().mockResolvedValue([board1, board2]);
    const docGet = vi.fn().mockResolvedValue(foundSnap);
    const doc = vi.fn().mockReturnValue({ get: docGet });

    const db = {
      collection: (name: string) => {
        if (name !== 'boards') throw new Error('unexpected collection');
        return { listDocuments };
      },
      doc,
      collectionGroup: (_name: string) => {
        throw new Error('collectionGroup not needed for this test');
      },
    };

    const store = new TicketsStore(db as unknown as Firestore);

    const first = await store.getById(ticketId);
    expect(first?.boardId).toBe('b2');
    expect(listDocuments).toHaveBeenCalledTimes(1);

    const second = await store.getById(ticketId);
    expect(second?.boardId).toBe('b2');
    expect(listDocuments).toHaveBeenCalledTimes(1); // no second scan
    expect(doc).toHaveBeenCalledWith('boards/b2/tickets/t1');
    expect(docGet).toHaveBeenCalledTimes(1);
  });
});


