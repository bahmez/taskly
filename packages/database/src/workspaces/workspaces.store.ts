import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type {
  WorkspaceCreateInput,
  WorkspaceInvitationModel,
  WorkspaceMemberModel,
  WorkspaceModel,
  WorkspaceRole,
  WorkspaceUpdateInput,
} from './workspace.model';

type WorkspaceDoc = Omit<WorkspaceModel, 'id'>;
type MemberDoc = Omit<WorkspaceMemberModel, 'userId'> & { userId: string };
type InvitationDoc = Omit<WorkspaceInvitationModel, 'id' | 'workspaceId'>;

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class WorkspacesStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private workspacesCol() {
    return this.db.collection('workspaces');
  }

  private workspaceRef(workspaceId: string) {
    return this.workspacesCol().doc(workspaceId);
  }

  private membersCol(workspaceId: string) {
    return this.workspaceRef(workspaceId).collection('members');
  }

  private invitationsCol(workspaceId: string) {
    return this.workspaceRef(workspaceId).collection('invitations');
  }

  async createWorkspace(
    input: WorkspaceCreateInput,
  ): Promise<WorkspaceModel> {
    const now = nowIso();
    const ref = this.workspacesCol().doc();
    const doc: WorkspaceDoc = {
      title: input.title,
      description: input.description ?? '',
      isArchived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);
    return { id: ref.id, ...doc };
  }

  async getWorkspaceById(workspaceId: string): Promise<WorkspaceModel | null> {
    const snap = await this.workspaceRef(workspaceId).get();
    if (!snap.exists) return null;
    const data = snap.data() as WorkspaceDoc;
    return { id: snap.id, ...data };
  }

  async updateWorkspace(
    workspaceId: string,
    patch: WorkspaceUpdateInput,
  ): Promise<WorkspaceModel> {
    const ref = this.workspaceRef(workspaceId);
    const now = nowIso();
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as WorkspaceDoc;
    return { id: snap.id, ...data };
  }

  async archiveWorkspace(workspaceId: string): Promise<void> {
    const now = nowIso();
    await this.workspaceRef(workspaceId).update({
      isArchived: true,
      archivedAt: now,
      updatedAt: now,
    });
  }

  async unarchiveWorkspace(workspaceId: string): Promise<void> {
    const now = nowIso();
    await this.workspaceRef(workspaceId).update({
      isArchived: false,
      archivedAt: null,
      updatedAt: now,
    });
  }

  async getMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberModel | null> {
    const snap = await this.membersCol(workspaceId).doc(userId).get();
    if (!snap.exists) return null;
    const data = snap.data() as MemberDoc;
    return { userId: snap.id, role: data.role, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }

  async upsertMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberModel> {
    const now = nowIso();
    const ref = this.membersCol(workspaceId).doc(userId);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        tx.update(ref, { role, updatedAt: now } satisfies Partial<MemberDoc>);
      } else {
        tx.create(ref, { userId, role, createdAt: now, updatedAt: now } satisfies MemberDoc);
      }
    });

    const after = await ref.get();
    const data = after.data() as MemberDoc;
    return { userId: after.id, role: data.role, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.membersCol(workspaceId).doc(userId).delete();
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberModel[]> {
    const snap = await this.membersCol(workspaceId).get();
    return snap.docs.map((d) => {
      const data = d.data() as MemberDoc;
      return { userId: d.id, role: data.role, createdAt: data.createdAt, updatedAt: data.updatedAt };
    });
  }

  async countMembers(workspaceId: string): Promise<number> {
    const snap = await this.membersCol(workspaceId).get();
    return snap.size;
  }

  async countAdmins(workspaceId: string): Promise<number> {
    const snap = await this.membersCol(workspaceId).where('role', '==', 'admin').get();
    return snap.size;
  }

  async listWorkspacesForUser(userId: string): Promise<WorkspaceModel[]> {
    try {
      const memberships = await this.db
        .collectionGroup('members')
        .where('userId', '==', userId)
        .get();

      const workspaceRefs = memberships.docs
        .map((m) => m.ref.parent.parent)
        .filter(Boolean);

      const snaps = await Promise.all(workspaceRefs.map((r) => r!.get()));
      const workspaces: WorkspaceModel[] = [];
      for (const snap of snaps) {
        if (!snap.exists) continue;
        const data = snap.data() as WorkspaceDoc;
        workspaces.push({ id: snap.id, ...data });
      }
      return workspaces.filter((w) => !w.isArchived);
    } catch (e) {
      // Some Firestore setups (notably certain project/database modes) may reject collectionGroup queries
      // with a FAILED_PRECONDITION (code 9) without details. Fallback to an MVP-friendly approach.
      const err = e as { code?: number | string; message?: string };
      const code = typeof err?.code === 'string' ? Number(err.code) : err?.code;
      if (code !== 9) throw e;

      const snap = await this.workspacesCol().where('isArchived', '==', false).limit(200).get();
      const candidates = snap.docs.map((d) => ({ id: d.id, ...(d.data() as WorkspaceDoc) }));

      const checks = await Promise.all(
        candidates.map(async (w) => {
          const m = await this.membersCol(w.id).doc(userId).get();
          return m.exists ? w : null;
        }),
      );

      return checks.filter((x): x is WorkspaceModel => Boolean(x));
    }
  }

  async listArchivedWorkspacesForUser(userId: string): Promise<WorkspaceModel[]> {
    try {
      const memberships = await this.db
        .collectionGroup('members')
        .where('userId', '==', userId)
        .get();

      const workspaceRefs = memberships.docs
        .map((m) => m.ref.parent.parent)
        .filter(Boolean);

      const snaps = await Promise.all(workspaceRefs.map((r) => r!.get()));
      const workspaces: WorkspaceModel[] = [];
      for (const snap of snaps) {
        if (!snap.exists) continue;
        const data = snap.data() as WorkspaceDoc;
        workspaces.push({ id: snap.id, ...data });
      }
      return workspaces.filter((w) => w.isArchived);
    } catch (e) {
      const err = e as { code?: number | string; message?: string };
      const code = typeof err?.code === 'string' ? Number(err.code) : err?.code;
      if (code !== 9) throw e;

      const snap = await this.workspacesCol().where('isArchived', '==', true).limit(200).get();
      const candidates = snap.docs.map((d) => ({ id: d.id, ...(d.data() as WorkspaceDoc) }));

      const checks = await Promise.all(
        candidates.map(async (w) => {
          const m = await this.membersCol(w.id).doc(userId).get();
          return m.exists ? w : null;
        }),
      );

      return checks.filter((x): x is WorkspaceModel => Boolean(x));
    }
  }

  async createInvitation(
    workspaceId: string,
    input: {
      token: string;
      role: WorkspaceRole;
      createdBy: string;
      expiresAt: string;
    },
  ): Promise<WorkspaceInvitationModel> {
    const now = nowIso();
    const ref = this.invitationsCol(workspaceId).doc();
    const doc: InvitationDoc = {
      token: input.token,
      role: input.role,
      createdBy: input.createdBy,
      createdAt: now,
      expiresAt: input.expiresAt,
      acceptedAt: null,
      acceptedBy: null,
      declinedAt: null,
      declinedBy: null,
      cancelledAt: null,
      cancelledBy: null,
    };
    await ref.create(doc);
    return { id: ref.id, workspaceId, ...doc };
  }

  async listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitationModel[]> {
    const now = nowIso();
    const snap = await this.invitationsCol(workspaceId)
      .where('cancelledAt', '==', null)
      .where('acceptedAt', '==', null)
      .where('declinedAt', '==', null)
      .where('expiresAt', '>', now)
      .get();

    return snap.docs.map((d) => {
      const data = d.data() as InvitationDoc;
      return { id: d.id, workspaceId, ...data };
    });
  }

  async findInvitationByToken(token: string): Promise<WorkspaceInvitationModel | null> {
    const snap = await this.db
      .collectionGroup('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    const workspaceRef = doc.ref.parent.parent;
    if (!workspaceRef) return null;
    const workspaceId = workspaceRef.id;
    const data = doc.data() as InvitationDoc;
    return { id: doc.id, workspaceId, ...data };
  }

  async acceptInvitationByToken(token: string, userId: string): Promise<WorkspaceInvitationModel> {
    // Find invitation doc reference via collectionGroup, then tx update + upsert member
    const snap = await this.db
      .collectionGroup('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (snap.empty) throw new Error('Invitation not found');
    const invDoc = snap.docs[0]!;
    const workspaceRef = invDoc.ref.parent.parent;
    if (!workspaceRef) throw new Error('Invitation workspace not found');
    const workspaceId = workspaceRef.id;

    const invRef = invDoc.ref;
    const memberRef = this.membersCol(workspaceId).doc(userId);
    const now = nowIso();

    await this.db.runTransaction(async (tx) => {
      const invSnap = await tx.get(invRef);
      const inv = invSnap.data() as InvitationDoc;
      if (!inv) throw new Error('Invitation not found');
      if (inv.cancelledAt) throw new Error('Invitation cancelled');
      if (inv.acceptedAt) throw new Error('Invitation already accepted');
      if (inv.declinedAt) throw new Error('Invitation already declined');
      if (inv.expiresAt <= now) throw new Error('Invitation expired');

      tx.update(invRef, { acceptedAt: now, acceptedBy: userId } satisfies Partial<InvitationDoc>);

      const memSnap = await tx.get(memberRef);
      if (memSnap.exists) {
        tx.update(memberRef, { role: inv.role, updatedAt: now } satisfies Partial<MemberDoc>);
      } else {
        tx.create(memberRef, { userId, role: inv.role, createdAt: now, updatedAt: now } satisfies MemberDoc);
      }
    });

    const after = await invRef.get();
    const data = after.data() as InvitationDoc;
    return { id: after.id, workspaceId, ...data };
  }

  async declineInvitationByToken(token: string, userId: string): Promise<WorkspaceInvitationModel> {
    const snap = await this.db
      .collectionGroup('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (snap.empty) throw new Error('Invitation not found');
    const invDoc = snap.docs[0]!;
    const workspaceRef = invDoc.ref.parent.parent;
    if (!workspaceRef) throw new Error('Invitation workspace not found');
    const workspaceId = workspaceRef.id;

    const invRef = invDoc.ref;
    const now = nowIso();
    await this.db.runTransaction(async (tx) => {
      const invSnap = await tx.get(invRef);
      const inv = invSnap.data() as InvitationDoc;
      if (!inv) throw new Error('Invitation not found');
      if (inv.cancelledAt) throw new Error('Invitation cancelled');
      if (inv.acceptedAt) throw new Error('Invitation already accepted');
      if (inv.declinedAt) throw new Error('Invitation already declined');
      if (inv.expiresAt <= now) throw new Error('Invitation expired');
      tx.update(invRef, { declinedAt: now, declinedBy: userId } satisfies Partial<InvitationDoc>);
    });

    const after = await invRef.get();
    const data = after.data() as InvitationDoc;
    return { id: after.id, workspaceId, ...data };
  }

  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
    cancelledBy: string,
  ): Promise<void> {
    const now = nowIso();
    await this.invitationsCol(workspaceId).doc(invitationId).update({
      cancelledAt: now,
      cancelledBy,
    });
  }

  async getInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationModel | null> {
    const snap = await this.invitationsCol(workspaceId).doc(invitationId).get();
    if (!snap.exists) return null;
    const data = snap.data() as InvitationDoc;
    return { id: snap.id, workspaceId, ...data };
  }
}


