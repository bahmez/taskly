import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { UsersStore } from './users.store';

describe('UsersStore', () => {
  it('getById normalizes avatar background', async () => {
    const snap = {
      exists: true,
      id: 'u1',
      data: () => ({
        username: 'alice',
        first_name: 'Alice',
        last_name: 'Doe',
        description: '',
        avatar: {
          type: 'initials',
          background: { type: 'color', value: '#0EA5E9' },
        },
        createdAt: 'now',
        updatedAt: 'now',
      }),
    };

    const ref = { get: async () => snap };
    const col = { doc: (_id: string) => ref };
    const db = { collection: (_name: string) => col };

    const store = new UsersStore(db as unknown as Firestore);
    const user = await store.getById('u1');

    expect(user?.avatar).toEqual({
      type: 'initials',
      background: { type: 'color', value: '#0EA5E9' },
    });
  });
});

type UserDoc = { username: string; first_name: string; last_name: string; description: string; createdAt: string; updatedAt: string };
type Doc = { id: string; data: () => UserDoc };
type Snap = { docs: Doc[] };

function makeDoc(id: string): Doc {
  return {
    id,
    data: () => ({
      username: id,
      first_name: id,
      last_name: id,
      description: '',
      createdAt: 'x',
      updatedAt: 'x',
    }),
  };
}

function makeCollectionForSearch(snapsByField: Record<string, Snap>) {
  return {
    orderBy: (field: string) => {
      const q = {
        startAt: (_: string) => q,
        endAt: (_: string) => q,
        limit: (_: number) => q,
        get: async () => snapsByField[field] ?? { docs: [] },
      };
      return q;
    },
    doc: (_id: string) => {
      throw new Error('doc() not implemented for this test');
    },
  };
}

describe('UsersStore', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('searchByPrefix returns [] for blank query', async () => {
    const db = {
      collection: vi.fn(),
    };
    const store = new UsersStore(db as unknown as Firestore);

    await expect(store.searchByPrefix('   ', 10)).resolves.toEqual([]);
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('searchByPrefix merges unique results across fields and caps to limit', async () => {
    const snapsByField: Record<string, Snap> = {
      username: { docs: [makeDoc('u1'), makeDoc('u2')] },
      first_name: { docs: [makeDoc('u2'), makeDoc('u3')] },
      last_name: { docs: [makeDoc('u4')] },
    };

    const usersCol = makeCollectionForSearch(snapsByField);
    const db = {
      collection: (name: string) => {
        if (name !== 'users') throw new Error('unexpected collection');
        return usersCol;
      },
    };
    const store = new UsersStore(db as unknown as Firestore);

    const res = await store.searchByPrefix('al', 3);
    expect(res.map((u) => u.id)).toEqual(['u1', 'u2', 'u3']);
  });

  it('searchByPrefix caps limit to 30', async () => {
    const docs = Array.from({ length: 100 }, (_, i) => makeDoc(`u${i}`));
    const snapsByField: Record<string, Snap> = {
      username: { docs },
      first_name: { docs: [] },
      last_name: { docs: [] },
    };

    const usersCol = makeCollectionForSearch(snapsByField);
    const db = { collection: (_: string) => usersCol };
    const store = new UsersStore(db as unknown as Firestore);

    const res = await store.searchByPrefix('u', 999);
    expect(res).toHaveLength(30);
  });
});


