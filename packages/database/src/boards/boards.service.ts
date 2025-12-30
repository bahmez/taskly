import { Inject, Injectable } from '@nestjs/common';
import type {
  BoardColumnCreateInput,
  BoardColumnModel,
  BoardColumnUpdateInput,
  BoardCreateInput,
  BoardModel,
  BoardUpdateInput,
} from './board.model';
import type { TicketCreateInput, TicketModel } from '../tickets/ticket.model';
import { BoardsStore } from './boards.store';

@Injectable()
export class BoardsService {
  constructor(@Inject(BoardsStore) private readonly store: BoardsStore) {}

  createBoard(input: BoardCreateInput): Promise<BoardModel> {
    return this.store.createBoard(input);
  }

  getBoardById(boardId: string): Promise<BoardModel | null> {
    return this.store.getBoardById(boardId);
  }

  updateBoard(boardId: string, patch: BoardUpdateInput): Promise<BoardModel> {
    return this.store.updateBoard(boardId, patch);
  }

  archiveBoard(boardId: string): Promise<void> {
    return this.store.archiveBoard(boardId);
  }

  listBoardsForWorkspace(workspaceId: string): Promise<BoardModel[]> {
    return this.store.listBoardsForWorkspace(workspaceId);
  }

  reorderBoards(workspaceId: string, boardIds: string[]): Promise<void> {
    return this.store.reorderBoards(workspaceId, boardIds);
  }

  listColumns(boardId: string): Promise<BoardColumnModel[]> {
    return this.store.listColumns(boardId);
  }

  createColumn(boardId: string, input: BoardColumnCreateInput): Promise<BoardColumnModel> {
    return this.store.createColumn(boardId, input);
  }

  updateColumn(boardId: string, columnId: string, patch: BoardColumnUpdateInput): Promise<BoardColumnModel> {
    return this.store.updateColumn(boardId, columnId, patch);
  }

  deleteColumn(boardId: string, columnId: string): Promise<void> {
    return this.store.deleteColumn(boardId, columnId);
  }

  reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    return this.store.reorderColumns(boardId, columnIds);
  }

  listTickets(boardId: string): Promise<TicketModel[]> {
    return this.store.listTickets(boardId);
  }

  listTicketsByColumn(boardId: string, columnId: string): Promise<TicketModel[]> {
    return this.store.listTicketsByColumn(boardId, columnId);
  }

  createTicket(boardId: string, input: TicketCreateInput): Promise<TicketModel> {
    return this.store.createTicket(boardId, input);
  }

  moveTicket(boardId: string, ticketId: string, input: { columnId: string; position: number }): Promise<void> {
    return this.store.moveTicket(boardId, ticketId, input);
  }

  archiveTicket(boardId: string, ticketId: string): Promise<void> {
    return this.store.archiveTicket(boardId, ticketId);
  }
}


