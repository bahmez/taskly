import { Injectable } from '@nestjs/common';
import type { TicketCommentModel, TicketModel, TicketUpdateInput } from './ticket.model';
import { TicketsStore } from './tickets.store';

@Injectable()
export class TicketsService {
  constructor(private readonly store: TicketsStore) {}

  getById(ticketId: string): Promise<TicketModel | null> {
    return this.store.getById(ticketId);
  }

  update(ticketId: string, patch: TicketUpdateInput): Promise<TicketModel> {
    return this.store.update(ticketId, patch);
  }

  archive(ticketId: string): Promise<void> {
    return this.store.archive(ticketId);
  }

  listComments(ticketId: string): Promise<TicketCommentModel[]> {
    return this.store.listComments(ticketId);
  }

  addComment(ticketId: string, input: { authorId: string; content: string }): Promise<TicketCommentModel> {
    return this.store.addComment(ticketId, input);
  }

  updateComment(ticketId: string, commentId: string, patch: { content: string }): Promise<TicketCommentModel> {
    return this.store.updateComment(ticketId, commentId, patch);
  }

  deleteComment(ticketId: string, commentId: string): Promise<void> {
    return this.store.deleteComment(ticketId, commentId);
  }

  getAssigneeIds(ticketId: string): Promise<string[]> {
    return this.store.getAssigneeIds(ticketId);
  }

  addAssignee(ticketId: string, userId: string): Promise<void> {
    return this.store.addAssignee(ticketId, userId);
  }

  removeAssignee(ticketId: string, userId: string): Promise<void> {
    return this.store.removeAssignee(ticketId, userId);
  }
}


