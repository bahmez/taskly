import { Inject, Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type {
  BoardColumnCreateInput,
  BoardColumnModel,
  BoardColumnUpdateInput,
  BoardCreateInput,
  BoardLabelCreateInput,
  BoardLabelModel,
  BoardLabelUpdateInput,
  BoardModel,
  BoardUpdateInput,
} from './board.model';
import type { TicketCreateInput, TicketModel } from '../tickets/ticket.model';

type BoardDoc = Omit<BoardModel, 'id'>;
type ColumnDoc = Omit<BoardColumnModel, 'id' | 'boardId'>;
type TicketDoc = Omit<TicketModel, 'id' | 'boardId'>;
type LabelDoc = Omit<BoardLabelModel, 'id' | 'boardId'>;

function nowIso(): string {
  return new Date().toISOString();
}

const DEFAULT_COLUMNS: Array<{ title: string; key: string; position: number }> = [
  { title: 'Todo', key: 'todo', position: 1 },
  { title: 'In progress', key: 'in_progress', position: 2 },
  { title: 'Done', key: 'done', position: 3 },
];

const LABEL_COLOR_PALETTE: string[] = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
];

const DEFAULT_LABELS: Array<{ name: string; color: string; position: number }> = [
  { name: 'Bug', color: '#EF4444', position: 1 },
  { name: 'Feature', color: '#3B82F6', position: 2 },
  { name: 'Improvement', color: '#22C55E', position: 3 },
  { name: 'Question', color: '#EAB308', position: 4 },
  { name: 'Urgent', color: '#8B5CF6', position: 5 },
];

function randomPaletteColor(): string {
  const idx = Math.floor(Math.random() * LABEL_COLOR_PALETTE.length);
  return LABEL_COLOR_PALETTE[Math.min(Math.max(idx, 0), LABEL_COLOR_PALETTE.length - 1)]!;
}

@Injectable()
export class BoardsStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private boardsCol() {
    return this.db.collection('boards');
  }

  private boardRef(boardId: string) {
    return this.boardsCol().doc(boardId);
  }

  private columnsCol(boardId: string) {
    return this.boardRef(boardId).collection('columns');
  }

  private ticketsCol(boardId: string) {
    return this.boardRef(boardId).collection('tickets');
  }

  private labelsCol(boardId: string) {
    return this.boardRef(boardId).collection('labels');
  }

  async createBoard(input: BoardCreateInput): Promise<BoardModel> {
    const now = nowIso();
    const last = await this.boardsCol()
      .where('workspaceId', '==', input.workspaceId)
      .where('isArchived', '==', false)
      .orderBy('order', 'desc')
      .limit(1)
      .get();
    const maxOrder = last.empty ? -1 : ((last.docs[0]!.data() as BoardDoc).order ?? 0);
    const order = maxOrder + 1;

    const ref = this.boardsCol().doc();
    const doc: BoardDoc = {
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? '',
      background: input.background ?? null,
      order,
      isArchived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);

    // Default columns
    const batch = this.db.batch();
    for (const c of DEFAULT_COLUMNS) {
      const colRef = this.columnsCol(ref.id).doc();
      batch.create(colRef, {
        title: c.title,
        key: c.key,
        position: c.position,
        createdAt: now,
        updatedAt: now,
      } satisfies ColumnDoc);
    }

    // Default labels
    for (const l of DEFAULT_LABELS) {
      const labelRef = this.labelsCol(ref.id).doc();
      batch.create(labelRef, {
        name: l.name,
        color: l.color,
        position: l.position,
        createdAt: now,
        updatedAt: now,
      } satisfies LabelDoc);
    }
    await batch.commit();

    return { id: ref.id, ...doc };
  }

  async getBoardById(boardId: string): Promise<BoardModel | null> {
    const snap = await this.boardRef(boardId).get();
    if (!snap.exists) return null;
    const data = snap.data() as BoardDoc;
    return { id: snap.id, ...data };
  }

  async updateBoard(boardId: string, patch: BoardUpdateInput): Promise<BoardModel> {
    const ref = this.boardRef(boardId);
    const now = nowIso();
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as BoardDoc;
    return { id: snap.id, ...data };
  }

  async archiveBoard(boardId: string): Promise<void> {
    const now = nowIso();
    await this.boardRef(boardId).update({ isArchived: true, archivedAt: now, updatedAt: now });
  }

  async listBoardsForWorkspace(workspaceId: string): Promise<BoardModel[]> {
    const snap = await this.boardsCol()
      .where('workspaceId', '==', workspaceId)
      .where('isArchived', '==', false)
      .orderBy('order', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as BoardDoc) }));
  }

  async reorderBoards(workspaceId: string, boardIds: string[]): Promise<void> {
    const refs = boardIds.map((id) => this.boardRef(id));
    await this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (const [idx, snap] of snaps.entries()) {
        if (!snap.exists) throw new Error(`Board not found: ${boardIds[idx]}`);
        const data = snap.data() as BoardDoc;
        if (data.workspaceId !== workspaceId) throw new Error(`Board not in workspace: ${boardIds[idx]}`);
      }
      const now = nowIso();
      for (let i = 0; i < refs.length; i++) {
        tx.update(refs[i]!, { order: i, updatedAt: now } satisfies Partial<BoardDoc>);
      }
    });
  }

  // Columns
  async listColumns(boardId: string): Promise<BoardColumnModel[]> {
    const snap = await this.columnsCol(boardId).orderBy('position', 'asc').get();
    return snap.docs.map((d) => ({
      id: d.id,
      boardId,
      ...(d.data() as ColumnDoc),
    }));
  }

  async createColumn(boardId: string, input: BoardColumnCreateInput): Promise<BoardColumnModel> {
    const now = nowIso();
    const last = await this.columnsCol(boardId).orderBy('position', 'desc').limit(1).get();
    const max = last.empty ? 0 : ((last.docs[0]!.data() as ColumnDoc).position ?? 0);
    const position = max + 1;
    const ref = this.columnsCol(boardId).doc();
    const doc: ColumnDoc = { title: input.title, key: input.key, position, createdAt: now, updatedAt: now };
    await ref.create(doc);
    return { id: ref.id, boardId, ...doc };
  }

  async updateColumn(boardId: string, columnId: string, patch: BoardColumnUpdateInput): Promise<BoardColumnModel> {
    const now = nowIso();
    const ref = this.columnsCol(boardId).doc(columnId);
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as ColumnDoc;
    return { id: snap.id, boardId, ...data };
  }

  async deleteColumn(boardId: string, columnId: string): Promise<void> {
    // Safety: forbid delete if tickets exist in column
    const ticketsSnap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .where('columnId', '==', columnId)
      .limit(1)
      .get();
    if (!ticketsSnap.empty) throw new Error('Cannot delete column with tickets');
    await this.columnsCol(boardId).doc(columnId).delete();
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    const refs = columnIds.map((id) => this.columnsCol(boardId).doc(id));
    await this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (const [idx, snap] of snaps.entries()) {
        if (!snap.exists) throw new Error(`Column not found: ${columnIds[idx]}`);
      }
      const now = nowIso();
      for (let i = 0; i < refs.length; i++) {
        tx.update(refs[i]!, { position: i + 1, updatedAt: now } satisfies Partial<ColumnDoc>);
      }
    });
  }

  // Labels
  async listLabels(boardId: string): Promise<BoardLabelModel[]> {
    const snap = await this.labelsCol(boardId).orderBy('position', 'asc').get();
    return snap.docs.map((d) => ({ id: d.id, boardId, ...(d.data() as LabelDoc) }));
  }

  async createLabel(boardId: string, input: BoardLabelCreateInput): Promise<BoardLabelModel> {
    const now = nowIso();
    const last = await this.labelsCol(boardId).orderBy('position', 'desc').limit(1).get();
    const max = last.empty ? 0 : ((last.docs[0]!.data() as LabelDoc).position ?? 0);
    const position = Number.isFinite(max) ? Number(max) + 1 : 1;

    const ref = this.labelsCol(boardId).doc();
    const color = (input.color ?? '').trim() || randomPaletteColor();
    const doc: LabelDoc = { name: input.name, color, position, createdAt: now, updatedAt: now };
    await ref.create(doc);
    return { id: ref.id, boardId, ...doc };
  }

  async updateLabel(boardId: string, labelId: string, patch: BoardLabelUpdateInput): Promise<BoardLabelModel> {
    const now = nowIso();
    const ref = this.labelsCol(boardId).doc(labelId);
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as LabelDoc;
    return { id: snap.id, boardId, ...data };
  }

  async deleteLabel(boardId: string, labelId: string): Promise<void> {
    // Remove label from tickets in this board first (best effort)
    const ticketsSnap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .where('labelIds', 'array-contains', labelId)
      .get();

    let batch = this.db.batch();
    let ops = 0;
    for (const d of ticketsSnap.docs) {
      batch.update(d.ref, { labelIds: FieldValue.arrayRemove(labelId), updatedAt: nowIso() });
      ops++;
      if (ops >= 450) {
        await batch.commit();
        batch = this.db.batch();
        ops = 0;
      }
    }
    await batch.commit();

    await this.labelsCol(boardId).doc(labelId).delete();
  }

  async reorderLabels(boardId: string, labelIds: string[]): Promise<void> {
    const refs = labelIds.map((id) => this.labelsCol(boardId).doc(id));
    await this.db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      for (const [idx, snap] of snaps.entries()) {
        if (!snap.exists) throw new Error(`Label not found: ${labelIds[idx]}`);
      }
      const now = nowIso();
      for (let i = 0; i < refs.length; i++) {
        tx.update(refs[i]!, { position: i + 1, updatedAt: now } satisfies Partial<LabelDoc>);
      }
    });
  }

  // Tickets
  async listTickets(boardId: string): Promise<TicketModel[]> {
    const snap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .orderBy('columnId', 'asc')
      .orderBy('position', 'asc')
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as Partial<TicketDoc>;
      return {
        id: d.id,
        boardId,
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
    });
  }

  async listTicketsByColumn(boardId: string, columnId: string): Promise<TicketModel[]> {
    const snap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .where('columnId', '==', columnId)
      .orderBy('position', 'asc')
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as Partial<TicketDoc>;
      return {
        id: d.id,
        boardId,
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
    });
  }

  async createTicket(boardId: string, input: TicketCreateInput): Promise<TicketModel> {
    const now = nowIso();

    const last = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .where('columnId', '==', input.columnId)
      .orderBy('position', 'desc')
      .limit(1)
      .get();
    const max = last.empty ? 0 : ((last.docs[0]!.data() as TicketDoc).position ?? 0);
    const position = max + 1;

    const ref = this.ticketsCol(boardId).doc();
    const doc: TicketDoc = {
      columnId: input.columnId,
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ?? null,
      assigneeIds: input.assigneeIds ?? [],
      labelIds: [],
      position,
      isArchived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.create(doc);
    return { id: ref.id, boardId, ...doc };
  }

  async moveTicket(
    boardId: string,
    ticketId: string,
    input: { columnId: string; position: number },
  ): Promise<void> {
    const ticketRef = this.ticketsCol(boardId).doc(ticketId);
    const now = nowIso();

    await this.db.runTransaction(async (tx) => {
      const tSnap = await tx.get(ticketRef);
      if (!tSnap.exists) throw new Error('Ticket not found');
      const t = tSnap.data() as TicketDoc;
      if (t.isArchived) throw new Error('Ticket not found');

      const fromColumnId = t.columnId;
      const toColumnId = input.columnId;
      const toPos = Math.max(1, Math.floor(input.position));

      const fromQ = this.ticketsCol(boardId)
        .where('isArchived', '==', false)
        .where('columnId', '==', fromColumnId)
        .orderBy('position', 'asc');
      const toQ = fromColumnId === toColumnId
        ? fromQ
        : this.ticketsCol(boardId)
            .where('isArchived', '==', false)
            .where('columnId', '==', toColumnId)
            .orderBy('position', 'asc');

      const [fromSnap, toSnap] = await Promise.all([tx.get(fromQ), tx.get(toQ)]);
      const fromIds = fromSnap.docs.map((d) => d.id).filter((id) => id !== ticketId);
      const toIdsBase = (fromColumnId === toColumnId ? fromIds : toSnap.docs.map((d) => d.id));
      const toIds = toIdsBase.filter((id) => id !== ticketId);

      const insertIndex = Math.min(Math.max(toPos - 1, 0), toIds.length);
      toIds.splice(insertIndex, 0, ticketId);

      // Re-number from column
      if (fromColumnId !== toColumnId) {
        for (let i = 0; i < fromIds.length; i++) {
          tx.update(this.ticketsCol(boardId).doc(fromIds[i]!), { position: i + 1, updatedAt: now } satisfies Partial<TicketDoc>);
        }
      }

      // Update tickets in target column
      for (let i = 0; i < toIds.length; i++) {
        const id = toIds[i]!;
        tx.update(this.ticketsCol(boardId).doc(id), {
          columnId: toColumnId,
          position: i + 1,
          updatedAt: now,
        } satisfies Partial<TicketDoc>);
      }
    });
  }

  async archiveTicket(boardId: string, ticketId: string): Promise<void> {
    const now = nowIso();
    await this.ticketsCol(boardId).doc(ticketId).update({
      isArchived: true,
      archivedAt: now,
      updatedAt: now,
    } satisfies Partial<TicketDoc>);
  }
}


