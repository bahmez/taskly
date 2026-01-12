import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { WorkspacesStore } from './workspaces.store';

type WorkspaceDoc = { title: string; description: string; isArchived: boolean; archivedAt: string | null; createdAt: string; updatedAt: string };
type WorkspaceSnap = { id: string; exists: boolean; data: () => WorkspaceDoc };

function makeWorkspaceSnap(id: string, doc: WorkspaceDoc): WorkspaceSnap {
  return { id, exists: true, data: () => doc };
}

describe('WorkspacesStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('listWorkspacesForUser filters out archived workspaces (collectionGroup path)', async () => {
    const w1 = makeWorkspaceSnap('w1', {
      title: 'A',
      description: '',
      isArchived: false,
      archivedAt: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    const w2 = makeWorkspaceSnap('w2', {
      title: 'B',
      description: '',
      isArchived: true,
      archivedAt: 'x',
      createdAt: 'x',
      updatedAt: 'x',
    });

    const wsRef1 = { id: 'w1', get: async () => w1 };
    const wsRef2 = { id: 'w2', get: async () => w2 };
    const membershipsSnap = {
      docs: [
        { ref: { parent: { parent: wsRef1 } } },
        { ref: { parent: { parent: wsRef2 } } },
      ],
    };

    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          get: async () => membershipsSnap,
        }),
      }),
      collection: (_name: string) => {
        throw new Error('collection not expected in this test');
      },
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    const res = await store.listWorkspacesForUser('u1');
    expect(res.map((w) => w.id)).toEqual(['w1']);
  });

  it('listWorkspacesForUser falls back when collectionGroup fails with code 9', async () => {
    const workspacesSnap = {
      docs: [
        { id: 'w1', data: () => ({ title: 'A', description: '', isArchived: false, archivedAt: null, createdAt: 'x', updatedAt: 'x' }) },
        { id: 'w2', data: () => ({ title: 'B', description: '', isArchived: false, archivedAt: null, createdAt: 'x', updatedAt: 'x' }) },
      ],
    };

    const memberGetByWorkspaceId: Record<string, boolean> = { w1: false, w2: true };

    const workspacesCol = {
      where: (_f: string, _op: string, _v: boolean) => ({
        limit: (_n: number) => ({
          get: async () => workspacesSnap,
        }),
      }),
      doc: (workspaceId: string) => ({
        collection: (_sub: string) => ({
          doc: (_userId: string) => ({
            get: async () => ({ exists: memberGetByWorkspaceId[workspaceId] ?? false }),
          }),
        }),
      }),
    };

    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          get: async () => {
            const err = new Error('FAILED_PRECONDITION') as Error & { code?: number };
            err.code = 9;
            throw err;
          },
        }),
      }),
      collection: (name: string) => {
        if (name !== 'workspaces') throw new Error('unexpected collection');
        return workspacesCol;
      },
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    const res = await store.listWorkspacesForUser('u1');
    expect(res.map((w) => w.id)).toEqual(['w2']);
  });

  it('acceptInvitationByToken throws when invitation is not found', async () => {
    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          limit: (_n: number) => ({
            get: async () => ({ empty: true, docs: [] }),
          }),
        }),
      }),
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    await expect(store.acceptInvitationByToken('tok', 'u1')).rejects.toThrow('Invitation not found');
  });

  it('acceptInvitationByToken updates invitation + upserts member on success', async () => {
    const now = new Date().toISOString();
    const workspaceRef = { id: 'w1' };

    type InvitationDoc = {
      token: string;
      role: string;
      createdBy: string;
      createdAt: string;
      expiresAt: string;
      acceptedAt: string | null;
      acceptedBy: string | null;
      declinedAt: string | null;
      declinedBy: string | null;
      cancelledAt: string | null;
      cancelledBy: string | null;
    };

    const invitation: InvitationDoc = {
      token: 'tok',
      role: 'editor',
      createdBy: 'u_admin',
      createdAt: '2025-12-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
      acceptedAt: null,
      acceptedBy: null,
      declinedAt: null,
      declinedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    };

    const invRef = {
      id: 'inv1',
      parent: { parent: workspaceRef },
      get: async () => ({ id: 'inv1', data: () => invitation }),
    };
    const invDoc = { id: 'inv1', ref: invRef };

    const memberRef = { id: 'u1' };

    const txOps: Array<{ kind: 'update' | 'create'; ref: unknown; data: unknown }> = [];

    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          limit: (_n: number) => ({
            get: async () => ({ empty: false, docs: [invDoc] }),
          }),
        }),
      }),
      collection: (_name: string) => ({
        doc: (workspaceId: string) => ({
          id: workspaceId,
          collection: (_sub: string) => ({
            doc: (userId: string) => ({ ...memberRef, id: userId }),
          }),
        }),
      }),
      runTransaction: async (
        fn: (tx: {
          get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }>;
          update: (ref: unknown, data: unknown) => void;
          create: (ref: unknown, data: unknown) => void;
        }) => Promise<void>,
      ) => {
        let memberExists = false;
        await fn({
          get: async (ref: unknown) => {
            if (ref === invRef) return { exists: true, data: () => invitation };
            // memberRef
            return { exists: memberExists, data: () => ({}) };
          },
          update: (ref: unknown, data: unknown) => {
            txOps.push({ kind: 'update', ref, data });
            if (ref === invRef) Object.assign(invitation, data as object);
          },
          create: (ref: unknown, data: unknown) => {
            txOps.push({ kind: 'create', ref, data });
            memberExists = true;
          },
        });
      },
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    const res = await store.acceptInvitationByToken('tok', 'u1');

    expect(res.workspaceId).toBe('w1');
    expect(res.acceptedAt).toBe(now);
    expect(res.acceptedBy).toBe('u1');
    expect(txOps.some((op) => op.kind === 'update' && op.ref === invRef)).toBe(true);
    expect(txOps.some((op) => op.kind === 'create')).toBe(true);
  });

  it('acceptInvitationByToken rejects expired invitations', async () => {
    const workspaceRef = { id: 'w1' };
    const invitation = {
      token: 'tok',
      role: 'viewer',
      createdBy: 'u_admin',
      createdAt: '2025-12-01T00:00:00.000Z',
      expiresAt: '2025-12-31T00:00:00.000Z', // expired relative to fake now
      acceptedAt: null,
      acceptedBy: null,
      declinedAt: null,
      declinedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    };
    const invRef = { id: 'inv1', parent: { parent: workspaceRef } };
    const invDoc = { id: 'inv1', ref: invRef };

    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          limit: (_n: number) => ({
            get: async () => ({ empty: false, docs: [invDoc] }),
          }),
        }),
      }),
      collection: (_name: string) => ({
        doc: (workspaceId: string) => ({
          id: workspaceId,
          collection: (_sub: string) => ({
            doc: (_userId: string) => ({ id: 'u1' }),
          }),
        }),
      }),
      runTransaction: async (fn: (tx: { get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }> }) => Promise<void>) => {
        await fn({
          get: async (_ref: unknown) => ({ exists: true, data: () => invitation }),
        });
      },
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    await expect(store.acceptInvitationByToken('tok', 'u1')).rejects.toThrow('Invitation expired');
  });

  it('declineInvitationByToken updates declinedAt/declinedBy', async () => {
    const now = new Date().toISOString();
    const workspaceRef = { id: 'w1' };
    const invitation = {
      token: 'tok',
      role: 'viewer',
      createdBy: 'u_admin',
      createdAt: '2025-12-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
      acceptedAt: null,
      acceptedBy: null,
      declinedAt: null,
      declinedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    };
    const invRef = {
      id: 'inv1',
      parent: { parent: workspaceRef },
      get: async () => ({ id: 'inv1', data: () => invitation }),
    };
    const invDoc = { id: 'inv1', ref: invRef };

    const db = {
      collectionGroup: (_name: string) => ({
        where: (_f: string, _op: string, _v: string) => ({
          limit: (_n: number) => ({
            get: async () => ({ empty: false, docs: [invDoc] }),
          }),
        }),
      }),
      runTransaction: async (
        fn: (tx: {
          get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }>;
          update: (ref: unknown, data: unknown) => void;
        }) => Promise<void>,
      ) => {
        await fn({
          get: async (_ref: unknown) => ({ exists: true, data: () => invitation }),
          update: (_ref: unknown, data: unknown) => Object.assign(invitation, data as object),
        });
      },
    };

    const store = new WorkspacesStore(db as unknown as Firestore);
    const res = await store.declineInvitationByToken('tok', 'u1');
    expect(res.workspaceId).toBe('w1');
    expect(res.declinedAt).toBe(now);
    expect(res.declinedBy).toBe('u1');
  });
});


