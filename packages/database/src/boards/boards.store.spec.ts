import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { BoardsStore } from './boards.store';

type Snap = { empty: boolean; docs: Array<{ id: string; data: () => unknown; ref?: unknown }> };

describe('BoardsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('createBoard sets order=max+1 and creates default columns+labels in a batch', async () => {
    const lastSnap: Snap = {
      empty: false,
      docs: [{ id: 'b0', data: () => ({ order: 4 }) }],
    };

    const boardCreate = vi.fn().mockResolvedValue(undefined);
    const boardRef = { id: 'b1', create: boardCreate, collection: vi.fn() };

    const boardsQuery = {
      where: () => boardsQuery,
      orderBy: () => boardsQuery,
      limit: () => boardsQuery,
      get: async () => lastSnap,
      doc: () => boardRef,
    };

    const batchCreates: Array<{ data: unknown }> = [];
    const batch = {
      create: (_ref: unknown, data: unknown) => {
        batchCreates.push({ data });
      },
      commit: async () => undefined,
    };

    const db = {
      collection: (name: string) => {
        if (name !== 'boards') throw new Error('unexpected collection');
        return boardsQuery;
      },
      batch: () => batch,
    };

    // columnsCol/labelsCol use boardRef(id).collection(...).doc()
    boardRef.collection.mockImplementation((sub: string) => ({
      doc: () => ({ id: `${sub}-id`, path: `${sub}-path` }),
    }));

    const store = new BoardsStore(db as unknown as Firestore);
    const created = await store.createBoard({ workspaceId: 'w1', title: 'Board' });

    expect(created.order).toBe(5);
    expect(created.id).toBe('b1');
    expect(boardCreate).toHaveBeenCalled();

    // 3 default columns + 5 default labels = 8 batch creates
    expect(batchCreates.length).toBe(8);
    const keys = batchCreates
      .map((c) => c.data as { key?: unknown })
      .filter((d) => typeof d?.key === 'string')
      .map((d) => d.key as string);
    expect(keys).toEqual(expect.arrayContaining(['todo', 'in_progress', 'done']));
  });

  it('createLabel uses random palette color when input.color is blank', async () => {
    const lastSnap: Snap = { empty: true, docs: [] };
    const labelCreate = vi.fn().mockResolvedValue(undefined);
    const labelRef = { id: 'l1', create: labelCreate };

    const labelsQuery = {
      orderBy: () => labelsQuery,
      limit: () => labelsQuery,
      get: async () => lastSnap,
      doc: () => labelRef,
    };

    const boardRef = { collection: (_sub: string) => labelsQuery };
    const boardsCol = { doc: (_id: string) => boardRef };

    const db = {
      collection: (name: string) => {
        if (name !== 'boards') throw new Error('unexpected collection');
        return boardsCol;
      },
    };

    const rand = vi.spyOn(Math, 'random').mockReturnValue(0);
    const store = new BoardsStore(db as unknown as Firestore);

    const res = await store.createLabel('b1', { name: 'X', color: '   ' });
    expect(res.color).toBe('#EF4444'); // first palette color
    rand.mockRestore();
  });

  it('deleteColumn throws when tickets exist in the column', async () => {
    const ticketsSnap: Snap = { empty: false, docs: [{ id: 't1', data: () => ({}) }] };
    const ticketsQuery = {
      where: () => ticketsQuery,
      limit: () => ticketsQuery,
      get: async () => ticketsSnap,
      doc: () => ({ delete: vi.fn() }),
    };
    const columnsCol = { doc: () => ({ delete: vi.fn() }) };

    const boardRef = {
      collection: (sub: string) => {
        if (sub === 'tickets') return ticketsQuery;
        if (sub === 'columns') return columnsCol;
        throw new Error('unexpected subcollection');
      },
    };
    const boardsCol = { doc: (_id: string) => boardRef };
    const db = { collection: (_name: string) => boardsCol };
    const store = new BoardsStore(db as unknown as Firestore);

    await expect(store.deleteColumn('b1', 'c1')).rejects.toThrow('Cannot delete column with tickets');
  });

  it('reorderBoards validates workspaceId and updates order sequentially', async () => {
    const boardsCol = {
      doc: (id: string) => {
        const ref = { id };
        return ref;
      },
    };

    type Ref = { id: string };
    type Tx = {
      get: (ref: Ref) => Promise<{ exists: boolean; data: () => { workspaceId: string }; id: string }>;
      update: (ref: Ref, data: unknown) => void;
    };

    const txUpdates: Array<{ id: string; data: unknown }> = [];

    const db = {
      collection: (_name: string) => boardsCol,
      runTransaction: async (fn: (tx: Tx) => Promise<void>) => {
        const tx: Tx = {
          get: async (ref: Ref) => ({
            exists: true,
            data: () => ({ workspaceId: 'w1' }),
            id: ref.id,
          }),
          update: (ref: Ref, data: unknown) => txUpdates.push({ id: ref.id, data }),
        };
        await fn(tx);
      },
    };

    const store = new BoardsStore(db as unknown as Firestore);
    await store.reorderBoards('w1', ['b1', 'b2']);

    expect(txUpdates.map((u) => [u.id, (u.data as { order?: unknown }).order])).toEqual([
      ['b1', 0],
      ['b2', 1],
    ]);
  });

  it('getBoardById normalizes legacy string background', async () => {
    const boardSnap = {
      exists: true,
      id: 'b1',
      data: () => ({
        workspaceId: 'w1',
        title: 'Board',
        description: '',
        background: '#0EA5E9',
        order: 1,
        isArchived: false,
        archivedAt: null,
        createdAt: 'now',
        updatedAt: 'now',
      }),
    };

    const boardRef = { get: async () => boardSnap };
    const boardsCol = { doc: (_id: string) => boardRef };
    const db = { collection: (_name: string) => boardsCol };
    const store = new BoardsStore(db as unknown as Firestore);

    const board = await store.getBoardById('b1');
    expect(board?.background).toEqual({ type: 'color', value: '#0EA5E9' });
  });
});


