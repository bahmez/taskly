import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type {
  BoardColumnCreateInput,
  BoardColumnModel,
  BoardColumnUpdateInput,
  BoardCreateInput,
  BoardModel,
  BoardUpdateInput,
} from './board.model';
import type { TicketModel } from '../tickets/ticket.model';

type BoardDoc = Omit<BoardModel, 'id'>;
type ColumnDoc = Omit<BoardColumnModel, 'id' | 'boardId'>;
type TicketDoc = Omit<TicketModel, 'id' | 'boardId'>;

function nowIso(): string {
  return new Date().toISOString();
}

const DEFAULT_COLUMNS: Array<{ title: string; key: string; position: number }> = [
  { title: 'Todo', key: 'todo', position: 1 },
  { title: 'In progress', key: 'in_progress', position: 2 },
  { title: 'Done', key: 'done', position: 3 },
];

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

  // Tickets
  async listTickets(boardId: string): Promise<TicketModel[]> {
    const snap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .orderBy('columnId', 'asc')
      .orderBy('position', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, boardId, ...(d.data() as TicketDoc) }));
  }

  async listTicketsByColumn(boardId: string, columnId: string): Promise<TicketModel[]> {
    const snap = await this.ticketsCol(boardId)
      .where('isArchived', '==', false)
      .where('columnId', '==', columnId)
      .orderBy('position', 'asc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, boardId, ...(d.data() as TicketDoc) }));
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


