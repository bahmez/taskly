import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard } from '@taskly/auth';
import type { TicketUpdateInput, UserModel } from '@taskly/database';
import { TicketsService, UsersService } from '@taskly/database';
import { TicketAccessService } from './ticket-access.service.js';
import { GcsService } from '../gcs/gcs.service.js';
import crypto from 'node:crypto';

type PatchTicketDto = {
  title?: string;
  description?: string;
  dueDate?: string | null;
};

type CreateCommentDto = { content?: string };
type PatchCommentDto = { content?: string };
type AddAssigneeDto = { userId?: string };
type CreateChecklistDto = { title?: string };
type PatchChecklistDto = { title?: string };
type ReorderChecklistsDto = { checklistIds?: string[] };
type CreateChecklistItemDto = { content?: string };
type PatchChecklistItemDto = { content?: string; isDone?: boolean };
type ReorderChecklistItemsDto = { itemIds?: string[] };
type AddLabelDto = { labelId?: string };
type CreateAttachmentUploadUrlDto = { filename?: string; contentType?: string; resumable?: boolean };
type CompleteAttachmentDto = { size?: number };

@UseGuards(FirebaseAuthGuard)
@Controller('/api/tickets')
export class TicketController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly users: UsersService,
    private readonly access: TicketAccessService,
    private readonly gcs: GcsService,
  ) {}

  private sanitizeFilename(name: string): string {
    const base = name.replace(/[/\\]/g, '_').trim();
    return base.slice(0, 200) || 'file';
  }

  private buildObjectPath(boardId: string, ticketId: string, filename: string): string {
    const safe = this.sanitizeFilename(filename);
    const rand = crypto.randomBytes(8).toString('hex');
    return `boards/${boardId}/tickets/${ticketId}/${rand}-${safe}`;
  }

  @Get('/:ticketId')
  async getTicket(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.read');

    // If user cannot read assignments, hide those fields from this endpoint.
    const canAssignmentsRead = this.access.has(role, 'ticket.assignments.read');

    return {
      id: ticket.id,
      boardId: ticket.boardId,
      columnId: ticket.columnId,
      title: ticket.title,
      description: ticket.description,
      dueDate: ticket.dueDate,
      assigneeIds: canAssignmentsRead ? ticket.assigneeIds : undefined,
      labelIds: ticket.labelIds,
      position: ticket.position,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  @Patch('/:ticketId')
  async patchTicket(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Body() body: PatchTicketDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const patch: TicketUpdateInput = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) throw new BadRequestException('title cannot be empty');
      patch.title = t;
    }
    if (typeof body.description === 'string') {
      patch.description = body.description;
    }
    if (body.dueDate === null || typeof body.dueDate === 'string') {
      patch.dueDate = body.dueDate;
    }

    try {
      return await this.tickets.update(ticketId, patch);
    } catch (e) {
      const msg = (e as Error).message || 'Update failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId')
  async deleteTicket(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');
    try {
      await this.tickets.archive(ticketId);
    } catch (e) {
      const msg = (e as Error).message || 'Delete failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }

  // Comments
  @Get('/:ticketId/comments')
  async listComments(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.comments.read');
    try {
      return await this.tickets.listComments(ticketId);
    } catch (e) {
      const msg = (e as Error).message || 'List comments failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/comments')
  async addComment(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Body() body: CreateCommentDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.comments.write');

    const content = (body.content ?? '').trim();
    if (!content) throw new BadRequestException('content is required');

    try {
      return await this.tickets.addComment(ticketId, { authorId: user.id, content });
    } catch (e) {
      const msg = (e as Error).message || 'Add comment failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('/:ticketId/comments/:commentId')
  async patchComment(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @Body() body: PatchCommentDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.comments.write');

    const content = (body.content ?? '').trim();
    if (!content) throw new BadRequestException('content is required');

    try {
      return await this.tickets.updateComment(ticketId, commentId, { content });
    } catch (e) {
      const msg = (e as Error).message || 'Update comment failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId/comments/:commentId')
  async deleteComment(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.comments.write');
    try {
      await this.tickets.deleteComment(ticketId, commentId);
    } catch (e) {
      const msg = (e as Error).message || 'Delete comment failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }

  // Assignees
  @Get('/:ticketId/assignees')
  async listAssignees(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.assignments.read');
    try {
      const ids = await this.tickets.getAssigneeIds(ticketId);
      return { assigneeIds: ids };
    } catch (e) {
      const msg = (e as Error).message || 'List assignees failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/assignees')
  async addAssignee(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Body() body: AddAssigneeDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.assignments.write');

    const targetUserId = (body.userId ?? '').trim();
    if (!targetUserId) throw new BadRequestException('userId is required');
    const exists = await this.users.getById(targetUserId);
    if (!exists) throw new NotFoundException('User not found');

    try {
      await this.tickets.addAssignee(ticketId, targetUserId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Add assignee failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId/assignees/:userId')
  async removeAssignee(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('userId') targetUserId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.assignments.write');

    try {
      await this.tickets.removeAssignee(ticketId, targetUserId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Remove assignee failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  // Labels (assigned on ticket)
  @Get('/:ticketId/labels')
  async listLabels(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.read');
    try {
      const labelIds = await this.tickets.getLabelIds(ticketId);
      return { labelIds };
    } catch (e) {
      const msg = (e as Error).message || 'List labels failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/labels')
  async addLabel(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string, @Body() body: AddLabelDto) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const labelId = (body.labelId ?? '').trim();
    if (!labelId) throw new BadRequestException('labelId is required');

    try {
      await this.tickets.addLabel(ticketId, labelId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Add label failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId/labels/:labelId')
  async removeLabel(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string, @Param('labelId') labelId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    try {
      await this.tickets.removeLabel(ticketId, labelId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Remove label failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  // Checklists
  @Get('/:ticketId/checklists')
  async listChecklists(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.read');
    try {
      return await this.tickets.listChecklists(ticketId);
    } catch (e) {
      const msg = (e as Error).message || 'List checklists failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/checklists')
  async createChecklist(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string, @Body() body: CreateChecklistDto) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const title = (body.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');

    try {
      return await this.tickets.createChecklist(ticketId, { title });
    } catch (e) {
      const msg = (e as Error).message || 'Create checklist failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('/:ticketId/checklists/order')
  async reorderChecklists(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Body() body: ReorderChecklistsDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const checklistIds = body.checklistIds ?? [];
    if (!Array.isArray(checklistIds) || checklistIds.length === 0) throw new BadRequestException('checklistIds is required');
    if (new Set(checklistIds).size !== checklistIds.length) throw new BadRequestException('checklistIds must be unique');

    try {
      await this.tickets.reorderChecklists(ticketId, checklistIds);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Reorder checklists failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('/:ticketId/checklists/:checklistId')
  async patchChecklist(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Body() body: PatchChecklistDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    if (typeof body.title === 'string' && !title) throw new BadRequestException('title cannot be empty');

    try {
      return await this.tickets.updateChecklist(ticketId, checklistId, { title });
    } catch (e) {
      const msg = (e as Error).message || 'Update checklist failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId/checklists/:checklistId')
  async deleteChecklist(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');
    try {
      await this.tickets.deleteChecklist(ticketId, checklistId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Delete checklist failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  // Checklist items
  @Post('/:ticketId/checklists/:checklistId/items')
  async addChecklistItem(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Body() body: CreateChecklistItemDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const content = (body.content ?? '').trim();
    if (!content) throw new BadRequestException('content is required');

    try {
      return await this.tickets.addChecklistItem(ticketId, checklistId, { content });
    } catch (e) {
      const msg = (e as Error).message || 'Add checklist item failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('/:ticketId/checklists/:checklistId/items/order')
  async reorderChecklistItems(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Body() body: ReorderChecklistItemsDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const itemIds = body.itemIds ?? [];
    if (!Array.isArray(itemIds) || itemIds.length === 0) throw new BadRequestException('itemIds is required');
    if (new Set(itemIds).size !== itemIds.length) throw new BadRequestException('itemIds must be unique');

    try {
      await this.tickets.reorderChecklistItems(ticketId, checklistId, itemIds);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Reorder checklist items failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('/:ticketId/checklists/:checklistId/items/:itemId')
  async patchChecklistItem(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Body() body: PatchChecklistItemDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const patch: { content?: string; isDone?: boolean } = {};
    if (typeof body.content === 'string') {
      const c = body.content.trim();
      if (!c) throw new BadRequestException('content cannot be empty');
      patch.content = c;
    }
    if (typeof body.isDone === 'boolean') patch.isDone = body.isDone;
    if (Object.keys(patch).length === 0) throw new BadRequestException('Nothing to update');

    try {
      return await this.tickets.updateChecklistItem(ticketId, checklistId, itemId, patch);
    } catch (e) {
      const msg = (e as Error).message || 'Update checklist item failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('/:ticketId/checklists/:checklistId/items/:itemId')
  async deleteChecklistItem(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    try {
      await this.tickets.deleteChecklistItem(ticketId, checklistId, itemId);
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message || 'Delete checklist item failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  // Attachments (GCS signed URLs + metadata)
  @Get('/:ticketId/attachments')
  async listAttachments(@CurrentUser() user: UserModel, @Param('ticketId') ticketId: string) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.read');

    try {
      return await this.tickets.listAttachments(ticketId);
    } catch (e) {
      const msg = (e as Error).message || 'List attachments failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/attachments/upload-url')
  async createAttachmentUploadUrl(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Body() body: CreateAttachmentUploadUrlDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const filename = this.sanitizeFilename((body.filename ?? '').trim());
    const contentType = (body.contentType ?? '').trim() || 'application/octet-stream';
    if (!filename) throw new BadRequestException('filename is required');
    if (!contentType) throw new BadRequestException('contentType is required');

    const objectPath = this.buildObjectPath(ticket.boardId, ticketId, filename);

    try {
      const attachment = await this.tickets.createAttachmentRecord(ticketId, {
        createdBy: user.id,
        filename,
        contentType,
        objectPath,
      });

      const signed = await this.gcs.signedUploadUrl({
        objectPath,
        contentType,
        resumable: body.resumable ?? true,
      });

      return {
        attachment,
        upload: signed,
      };
    } catch (e) {
      const msg = (e as Error).message || 'Create attachment upload url failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post('/:ticketId/attachments/:attachmentId/complete')
  async completeAttachment(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @Body() body: CompleteAttachmentDto,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const size = Number(body.size);
    if (body.size !== undefined && !Number.isFinite(size)) throw new BadRequestException('size must be a number');

    try {
      return await this.tickets.completeAttachment(ticketId, attachmentId, {
        size: Number.isFinite(size) ? size : undefined,
      });
    } catch (e) {
      const msg = (e as Error).message || 'Complete attachment failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Get('/:ticketId/attachments/:attachmentId/download-url')
  async getAttachmentDownloadUrl(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.read');

    const att = await this.tickets.getAttachment(ticketId, attachmentId);
    if (!att) throw new NotFoundException('Attachment not found');
    if (att.status !== 'uploaded') throw new BadRequestException('Attachment not uploaded yet');

    const signed = await this.gcs.signedDownloadUrl({ objectPath: att.objectPath });
    return { attachment: att, download: signed };
  }

  @Delete('/:ticketId/attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser() user: UserModel,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const ticket = await this.access.getTicketOrThrow(ticketId);
    const { role } = await this.access.getWorkspaceRoleForTicketOrThrow(user.id, ticket);
    this.access.require(role, 'ticket.content.write');

    const att = await this.tickets.deleteAttachmentRecord(ticketId, attachmentId);
    if (att) {
      await this.gcs.deleteObject(att.objectPath);
    }
    return { ok: true };
  }
}


