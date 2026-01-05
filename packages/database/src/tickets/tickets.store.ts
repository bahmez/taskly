import { Inject, Injectable } from '@nestjs/common';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type {
  TicketAttachmentModel,
  TicketChecklistItemModel,
  TicketChecklistModel,
  TicketCommentModel,
  TicketModel,
  TicketUpdateInput,
} from './ticket.model';

type TicketDoc = Omit<TicketModel, 'id' | 'boardId'>;
type CommentDoc = Omit<TicketCommentModel, 'id' | 'ticketId'>;
type ChecklistDoc = Omit<TicketChecklistModel, 'id' | 'ticketId' | 'items'>;
type ChecklistItemDoc = Omit<TicketChecklistItemModel, 'id' | 'ticketId' | 'checklistId'>;
type AttachmentDoc = Omit<TicketAttachmentModel, 'id' | 'ticketId'>;

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class TicketsStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  // Cache ticketId -> boardId to avoid scanning boards for every sub-query (comments, attachments, etc.)
  private readonly ticketBoardCache = new Map<string, { boardId: string; path: string; at: number }>();
  private readonly ticketBoardCacheTtlMs = 5 * 60_000;

  private ticketsGroup() {
    // boards/{boardId}/tickets/{ticketId}
    return this.db.collectionGroup('tickets');
  }

  private async findTicketDoc(ticketId: string) {
    // Firestore collectionGroup queries on documentId require a FULL document path, not a bare id.
    // Since we only have ticketId, we resolve it by scanning boards and probing boards/{boardId}/tickets/{ticketId}.
    // We keep a small in-memory cache to avoid repeated scans.

    const cached = this.ticketBoardCache.get(ticketId);
    if (cached && Date.now() - cached.at < this.ticketBoardCacheTtlMs) {
      const ref = this.db.doc(cached.path);
      const snap = await ref.get();
      if (snap.exists) return { doc: snap, boardId: cached.boardId };
      this.ticketBoardCache.delete(ticketId);
    }

    const boards = await this.db.collection('boards').listDocuments();
    const batchSize = 20;

    for (let i = 0; i < boards.length; i += batchSize) {
      const slice = boards.slice(i, i + batchSize);
      const snaps = await Promise.all(slice.map((b) => b.collection('tickets').doc(ticketId).get()));
      for (let j = 0; j < snaps.length; j++) {
        const s = snaps[j]!;
        if (!s.exists) continue;
        const boardId = slice[j]!.id;
        const path = `boards/${boardId}/tickets/${ticketId}`;
        this.ticketBoardCache.set(ticketId, { boardId, path, at: Date.now() });
        return { doc: s, boardId };
      }
    }

    return null;
  }

  private commentCol(boardId: string, ticketId: string) {
    return this.db.collection('boards').doc(boardId).collection('tickets').doc(ticketId).collection('comments');
  }

  private checklistCol(boardId: string, ticketId: string) {
    return this.db.collection('boards').doc(boardId).collection('tickets').doc(ticketId).collection('checklists');
  }

  private checklistItemsCol(boardId: string, ticketId: string, checklistId: string) {
    return this.checklistCol(boardId, ticketId).doc(checklistId).collection('items');
  }

  private attachmentsCol(boardId: string, ticketId: string) {
    return this.db.collection('boards').doc(boardId).collection('tickets').doc(ticketId).collection('attachments');
  }

  private labelRef(boardId: string, labelId: string) {
    return this.db.collection('boards').doc(boardId).collection('labels').doc(labelId);
  }

  async getById(ticketId: string): Promise<TicketModel | null> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) return null;
    const data = found.doc.data() as Partial<TicketDoc>;
    if (data.isArchived) return null;
    return {
      id: found.doc.id,
      boardId: found.boardId,
      columnId: String(data.columnId ?? ''),
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      dueDate: (data.dueDate as string | null | undefined) ?? null,
      assigneeIds: Array.isArray(data.assigneeIds) ? (data.assigneeIds as string[]) : [],
      labelIds: Array.isArray(data.labelIds) ? (data.labelIds as string[]) : [],
      position: Number.isFinite(data.position) ? (data.position as number) : 1,
      isArchived: Boolean(data.isArchived ?? false),
      archivedAt: (data.archivedAt as string | null | undefined) ?? null,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
    };
  }

  async update(ticketId: string, patch: TicketUpdateInput): Promise<TicketModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const now = nowIso();
    await found.doc.ref.update({ ...patch, updatedAt: now });
    const after = await found.doc.ref.get();
    const data = after.data() as TicketDoc;
    return { id: after.id, boardId: found.boardId, ...data };
  }

  async archive(ticketId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) return;
    const now = nowIso();
    await found.doc.ref.update({ isArchived: true, archivedAt: now, updatedAt: now });
  }

  async listComments(ticketId: string): Promise<TicketCommentModel[]> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const snap = await this.commentCol(found.boardId, ticketId).orderBy('createdAt', 'asc').get();
    return snap.docs.map((d) => {
      const data = d.data() as CommentDoc;
      return { id: d.id, ticketId, authorId: data.authorId, content: data.content, createdAt: data.createdAt, updatedAt: data.updatedAt };
    });
  }

  async addComment(ticketId: string, input: { authorId: string; content: string }): Promise<TicketCommentModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const now = nowIso();
    const ref = this.commentCol(found.boardId, ticketId).doc();
    const doc: CommentDoc = {
      authorId: input.authorId,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);
    return { id: ref.id, ticketId, ...doc };
  }

  async updateComment(ticketId: string, commentId: string, patch: { content: string }): Promise<TicketCommentModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const now = nowIso();
    const ref = this.commentCol(found.boardId, ticketId).doc(commentId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Comment not found');
    await ref.update({ content: patch.content, updatedAt: now });
    const after = await ref.get();
    const data = after.data() as CommentDoc;
    return { id: after.id, ticketId, ...data };
  }

  async deleteComment(ticketId: string, commentId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');
    await this.commentCol(found.boardId, ticketId).doc(commentId).delete();
  }

  async getAssigneeIds(ticketId: string): Promise<string[]> {
    const t = await this.getById(ticketId);
    if (!t) throw new Error('Ticket not found');
    return t.assigneeIds;
  }

  async addAssignee(ticketId: string, userId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');
    await found.doc.ref.update({ assigneeIds: FieldValue.arrayUnion(userId), updatedAt: nowIso() });
  }

  async removeAssignee(ticketId: string, userId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');
    await found.doc.ref.update({ assigneeIds: FieldValue.arrayRemove(userId), updatedAt: nowIso() });
  }

  // Labels (assigned on ticket, labels live under board)
  async getLabelIds(ticketId: string): Promise<string[]> {
    const t = await this.getById(ticketId);
    if (!t) throw new Error('Ticket not found');
    return t.labelIds;
  }

  async addLabel(ticketId: string, labelId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const labelSnap = await this.labelRef(found.boardId, labelId).get();
    if (!labelSnap.exists) throw new Error('Label not found');

    await found.doc.ref.update({ labelIds: FieldValue.arrayUnion(labelId), updatedAt: nowIso() });
  }

  async removeLabel(ticketId: string, labelId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');
    await found.doc.ref.update({ labelIds: FieldValue.arrayRemove(labelId), updatedAt: nowIso() });
  }

  // Checklists
  async listChecklists(ticketId: string): Promise<TicketChecklistModel[]> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const snap = await this.checklistCol(found.boardId, ticketId).orderBy('position', 'asc').get();
    const base = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChecklistDoc) }));

    const withItems = await Promise.all(
      base.map(async (c) => {
        const itemsSnap = await this.checklistItemsCol(found.boardId, ticketId, c.id).orderBy('position', 'asc').get();
        const items = itemsSnap.docs.map((it) => {
          const data = it.data() as ChecklistItemDoc;
          return {
            id: it.id,
            ticketId,
            checklistId: c.id,
            content: String(data.content ?? ''),
            isDone: Boolean(data.isDone ?? false),
            position: Number.isFinite(data.position) ? (data.position as number) : 1,
            createdAt: String(data.createdAt ?? ''),
            updatedAt: String(data.updatedAt ?? ''),
          } satisfies TicketChecklistItemModel;
        });

        return {
          id: c.id,
          ticketId,
          title: String(c.title ?? ''),
          position: Number.isFinite(c.position) ? (c.position as number) : 1,
          createdAt: String(c.createdAt ?? ''),
          updatedAt: String(c.updatedAt ?? ''),
          items,
        } satisfies TicketChecklistModel;
      }),
    );

    return withItems;
  }

  async createChecklist(ticketId: string, input: { title: string }): Promise<TicketChecklistModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const now = nowIso();
    const last = await this.checklistCol(found.boardId, ticketId).orderBy('position', 'desc').limit(1).get();
    const max = last.empty ? 0 : ((last.docs[0]!.data() as Partial<ChecklistDoc>).position ?? 0);
    const position = Number.isFinite(max) ? Number(max) + 1 : 1;

    const ref = this.checklistCol(found.boardId, ticketId).doc();
    const doc: ChecklistDoc = { title: input.title, position, createdAt: now, updatedAt: now };
    await ref.create(doc);

    return { id: ref.id, ticketId, title: doc.title, position: doc.position, createdAt: doc.createdAt, updatedAt: doc.updatedAt, items: [] };
  }

  async updateChecklist(ticketId: string, checklistId: string, patch: { title?: string }): Promise<TicketChecklistModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const ref = this.checklistCol(found.boardId, ticketId).doc(checklistId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Checklist not found');

    const now = nowIso();
    await ref.update({ ...(patch.title ? { title: patch.title } : {}), updatedAt: now });

    // Return refreshed checklist + items
    const after = await ref.get();
    const data = after.data() as ChecklistDoc;
    const itemsSnap = await this.checklistItemsCol(found.boardId, ticketId, checklistId).orderBy('position', 'asc').get();
    const items = itemsSnap.docs.map((it) => {
      const d = it.data() as ChecklistItemDoc;
      return {
        id: it.id,
        ticketId,
        checklistId,
        content: String(d.content ?? ''),
        isDone: Boolean(d.isDone ?? false),
        position: Number.isFinite(d.position) ? (d.position as number) : 1,
        createdAt: String(d.createdAt ?? ''),
        updatedAt: String(d.updatedAt ?? ''),
      } satisfies TicketChecklistItemModel;
    });

    return {
      id: after.id,
      ticketId,
      title: String(data.title ?? ''),
      position: Number.isFinite(data.position) ? (data.position as number) : 1,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
      items,
    };
  }

  async deleteChecklist(ticketId: string, checklistId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const ref = this.checklistCol(found.boardId, ticketId).doc(checklistId);
    const snap = await ref.get();
    if (!snap.exists) return;

    const itemsSnap = await this.checklistItemsCol(found.boardId, ticketId, checklistId).get();
    let batch = this.db.batch();
    let ops = 0;
    for (const d of itemsSnap.docs) {
      batch.delete(d.ref);
      ops++;
      if (ops >= 450) {
        await batch.commit();
        batch = this.db.batch();
        ops = 0;
      }
    }
    batch.delete(ref);
    await batch.commit();
  }

  async reorderChecklists(ticketId: string, checklistIds: string[]): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const refs = checklistIds.map((id) => this.checklistCol(found.boardId, ticketId).doc(id));
    await this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (const [idx, s] of snaps.entries()) {
        if (!s.exists) throw new Error(`Checklist not found: ${checklistIds[idx]}`);
      }
      const now = nowIso();
      for (let i = 0; i < refs.length; i++) {
        tx.update(refs[i]!, { position: i + 1, updatedAt: now });
      }
    });
  }

  async addChecklistItem(ticketId: string, checklistId: string, input: { content: string }): Promise<TicketChecklistItemModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const checklistSnap = await this.checklistCol(found.boardId, ticketId).doc(checklistId).get();
    if (!checklistSnap.exists) throw new Error('Checklist not found');

    const now = nowIso();
    const last = await this.checklistItemsCol(found.boardId, ticketId, checklistId).orderBy('position', 'desc').limit(1).get();
    const max = last.empty ? 0 : ((last.docs[0]!.data() as Partial<ChecklistItemDoc>).position ?? 0);
    const position = Number.isFinite(max) ? Number(max) + 1 : 1;

    const ref = this.checklistItemsCol(found.boardId, ticketId, checklistId).doc();
    const doc: ChecklistItemDoc = {
      content: input.content,
      isDone: false,
      position,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);

    return { id: ref.id, ticketId, checklistId, ...doc };
  }

  async updateChecklistItem(
    ticketId: string,
    checklistId: string,
    itemId: string,
    patch: { content?: string; isDone?: boolean },
  ): Promise<TicketChecklistItemModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const itemRef = this.checklistItemsCol(found.boardId, ticketId, checklistId).doc(itemId);
    const snap = await itemRef.get();
    if (!snap.exists) throw new Error('Checklist item not found');

    const now = nowIso();
    const update: Partial<ChecklistItemDoc> = { updatedAt: now };
    if (typeof patch.content === 'string') update.content = patch.content;
    if (typeof patch.isDone === 'boolean') update.isDone = patch.isDone;
    await itemRef.update(update);

    const after = await itemRef.get();
    const data = after.data() as ChecklistItemDoc;
    return {
      id: after.id,
      ticketId,
      checklistId,
      content: String(data.content ?? ''),
      isDone: Boolean(data.isDone ?? false),
      position: Number.isFinite(data.position) ? (data.position as number) : 1,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
    };
  }

  async deleteChecklistItem(ticketId: string, checklistId: string, itemId: string): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');
    await this.checklistItemsCol(found.boardId, ticketId, checklistId).doc(itemId).delete();
  }

  async reorderChecklistItems(ticketId: string, checklistId: string, itemIds: string[]): Promise<void> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const refs = itemIds.map((id) => this.checklistItemsCol(found.boardId, ticketId, checklistId).doc(id));
    await this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (const [idx, s] of snaps.entries()) {
        if (!s.exists) throw new Error(`Checklist item not found: ${itemIds[idx]}`);
      }
      const now = nowIso();
      for (let i = 0; i < refs.length; i++) {
        tx.update(refs[i]!, { position: i + 1, updatedAt: now });
      }
    });
  }

  // Attachments (metadata only here; signed URLs handled at API layer)
  async listAttachments(ticketId: string): Promise<TicketAttachmentModel[]> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const snap = await this.attachmentsCol(found.boardId, ticketId).orderBy('createdAt', 'asc').get();
    return snap.docs.map((d) => {
      const data = d.data() as AttachmentDoc;
      return {
        id: d.id,
        ticketId,
        createdBy: String(data.createdBy ?? ''),
        filename: String(data.filename ?? ''),
        contentType: String(data.contentType ?? ''),
        objectPath: String(data.objectPath ?? ''),
        status: (data.status as TicketAttachmentModel['status']) ?? 'pending',
        size: (data.size as number | null | undefined) ?? null,
        createdAt: String(data.createdAt ?? ''),
        updatedAt: String(data.updatedAt ?? ''),
      };
    });
  }

  async createAttachmentRecord(
    ticketId: string,
    input: { createdBy: string; filename: string; contentType: string; objectPath: string },
  ): Promise<TicketAttachmentModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const now = nowIso();
    const ref = this.attachmentsCol(found.boardId, ticketId).doc();
    const doc: AttachmentDoc = {
      createdBy: input.createdBy,
      filename: input.filename,
      contentType: input.contentType,
      objectPath: input.objectPath,
      status: 'pending',
      size: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);
    return { id: ref.id, ticketId, ...doc };
  }

  async getAttachment(ticketId: string, attachmentId: string): Promise<TicketAttachmentModel | null> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const ref = this.attachmentsCol(found.boardId, ticketId).doc(attachmentId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() as AttachmentDoc;
    return { id: snap.id, ticketId, ...data };
  }

  async completeAttachment(ticketId: string, attachmentId: string, patch: { size?: number }): Promise<TicketAttachmentModel> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const ref = this.attachmentsCol(found.boardId, ticketId).doc(attachmentId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Attachment not found');

    const now = nowIso();
    const update: Partial<AttachmentDoc> = { status: 'uploaded', updatedAt: now };
    if (Number.isFinite(patch.size)) update.size = Math.max(0, Math.floor(patch.size!));
    await ref.update(update);

    const after = await ref.get();
    const data = after.data() as AttachmentDoc;
    return { id: after.id, ticketId, ...data };
  }

  async deleteAttachmentRecord(ticketId: string, attachmentId: string): Promise<TicketAttachmentModel | null> {
    const found = await this.findTicketDoc(ticketId);
    if (!found) throw new Error('Ticket not found');
    const current = found.doc.data() as Partial<TicketDoc>;
    if (current.isArchived) throw new Error('Ticket not found');

    const ref = this.attachmentsCol(found.boardId, ticketId).doc(attachmentId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() as AttachmentDoc;
    await ref.delete();
    return { id: snap.id, ticketId, ...data };
  }
}


