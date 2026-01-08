import { Inject, Injectable } from '@nestjs/common';
import type {
  TicketAttachmentModel,
  TicketChecklistItemModel,
  TicketChecklistModel,
  TicketCommentModel,
  TicketModel,
  TicketUpdateInput,
} from './ticket.model';
import { TicketsStore } from './tickets.store';

@Injectable()
export class TicketsService {
  constructor(@Inject(TicketsStore) private readonly store: TicketsStore) {}

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

  // Labels
  getLabelIds(ticketId: string): Promise<string[]> {
    return this.store.getLabelIds(ticketId);
  }

  addLabel(ticketId: string, labelId: string): Promise<void> {
    return this.store.addLabel(ticketId, labelId);
  }

  removeLabel(ticketId: string, labelId: string): Promise<void> {
    return this.store.removeLabel(ticketId, labelId);
  }

  // Checklists
  listChecklists(ticketId: string): Promise<TicketChecklistModel[]> {
    return this.store.listChecklists(ticketId);
  }

  createChecklist(ticketId: string, input: { title: string }): Promise<TicketChecklistModel> {
    return this.store.createChecklist(ticketId, input);
  }

  updateChecklist(ticketId: string, checklistId: string, patch: { title?: string }): Promise<TicketChecklistModel> {
    return this.store.updateChecklist(ticketId, checklistId, patch);
  }

  deleteChecklist(ticketId: string, checklistId: string): Promise<void> {
    return this.store.deleteChecklist(ticketId, checklistId);
  }

  reorderChecklists(ticketId: string, checklistIds: string[]): Promise<void> {
    return this.store.reorderChecklists(ticketId, checklistIds);
  }

  addChecklistItem(ticketId: string, checklistId: string, input: { content: string }): Promise<TicketChecklistItemModel> {
    return this.store.addChecklistItem(ticketId, checklistId, input);
  }

  updateChecklistItem(
    ticketId: string,
    checklistId: string,
    itemId: string,
    patch: { content?: string; isDone?: boolean },
  ): Promise<TicketChecklistItemModel> {
    return this.store.updateChecklistItem(ticketId, checklistId, itemId, patch);
  }

  deleteChecklistItem(ticketId: string, checklistId: string, itemId: string): Promise<void> {
    return this.store.deleteChecklistItem(ticketId, checklistId, itemId);
  }

  reorderChecklistItems(ticketId: string, checklistId: string, itemIds: string[]): Promise<void> {
    return this.store.reorderChecklistItems(ticketId, checklistId, itemIds);
  }

  // Attachments (metadata only here; signed URLs handled at API layer)
  listAttachments(ticketId: string): Promise<TicketAttachmentModel[]> {
    return this.store.listAttachments(ticketId);
  }

  createAttachmentRecord(
    ticketId: string,
    input: { createdBy: string; filename: string; contentType: string; objectPath: string },
  ): Promise<TicketAttachmentModel> {
    return this.store.createAttachmentRecord(ticketId, input);
  }

  getAttachment(ticketId: string, attachmentId: string): Promise<TicketAttachmentModel | null> {
    return this.store.getAttachment(ticketId, attachmentId);
  }

  completeAttachment(ticketId: string, attachmentId: string, patch: { size?: number }): Promise<TicketAttachmentModel> {
    return this.store.completeAttachment(ticketId, attachmentId, patch);
  }

  deleteAttachmentRecord(ticketId: string, attachmentId: string): Promise<TicketAttachmentModel | null> {
    return this.store.deleteAttachmentRecord(ticketId, attachmentId);
  }
}


