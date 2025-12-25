import { Inject, Injectable } from '@nestjs/common';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { TicketCommentModel, TicketModel, TicketUpdateInput } from './ticket.model';

type TicketDoc = Omit<TicketModel, 'id' | 'boardId'>;
type CommentDoc = Omit<TicketCommentModel, 'id' | 'ticketId'>;

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class TicketsStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private ticketsGroup() {
    // boards/{boardId}/tickets/{ticketId}
    return this.db.collectionGroup('tickets');
  }

  private async findTicketDoc(ticketId: string) {
    const snap = await this.ticketsGroup()
      .where(FieldPath.documentId(), '==', ticketId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    const boardRef = doc.ref.parent.parent;
    const boardId = boardRef?.id ?? null;
    if (!boardId) return null;
    return { doc, boardId };
  }

  private commentCol(boardId: string, ticketId: string) {
    return this.db.collection('boards').doc(boardId).collection('tickets').doc(ticketId).collection('comments');
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
}


