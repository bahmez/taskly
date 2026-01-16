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
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CurrentUser, FirebaseAuthGuard } from '@taskly/auth';
import type { TicketUpdateInput, UserModel } from '@taskly/database';
import { TicketsService, UsersService } from '@taskly/database';
import { TicketAccessService } from './ticket-access.service.js';
import { GcsService } from '../gcs/gcs.service.js';
import crypto from 'node:crypto';

class SignedUrlDto {
  @ApiProperty({ example: 'https://storage.googleapis.com/...' })
  url!: string;

  @ApiProperty({ enum: ['PUT', 'GET', 'POST'] })
  method!: 'PUT' | 'GET' | 'POST';

  @ApiProperty({ type: 'object', example: { 'Content-Type': 'application/pdf' } })
  headers!: Record<string, string>;

  @ApiProperty({ example: '2024-01-01T10:15:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ enum: ['write', 'resumable', 'read'] })
  type!: 'write' | 'resumable' | 'read';
}

class TicketDto {
  @ApiProperty({ example: 'ticket_123' })
  id!: string;

  @ApiProperty({ example: 'board_123' })
  boardId!: string;

  @ApiProperty({ example: 'col_123' })
  columnId!: string;

  @ApiProperty({ example: 'Fix login' })
  title!: string;

  @ApiProperty({ example: 'Details' })
  description!: string;

  @ApiProperty({ example: '2024-01-10T10:00:00.000Z', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ type: [String], required: false, example: ['usr_1', 'usr_2'] })
  assigneeIds?: string[];

  @ApiProperty({ type: [String], example: ['label_1'] })
  labelIds!: string[];

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: false })
  isArchived!: boolean;

  @ApiProperty({ example: null, nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class TicketDetailsDto {
  @ApiProperty({ example: 'ticket_123' })
  id!: string;

  @ApiProperty({ example: 'board_123' })
  boardId!: string;

  @ApiProperty({ example: 'col_123' })
  columnId!: string;

  @ApiProperty({ example: 'Fix login' })
  title!: string;

  @ApiProperty({ example: 'Details' })
  description!: string;

  @ApiProperty({ example: '2024-01-10T10:00:00.000Z', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ type: [String], required: false, example: ['usr_1', 'usr_2'] })
  assigneeIds?: string[];

  @ApiProperty({ type: [String], example: ['label_1'] })
  labelIds!: string[];

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class TicketCommentDto {
  @ApiProperty({ example: 'cmt_123' })
  id!: string;

  @ApiProperty({ example: 'ticket_123' })
  ticketId!: string;

  @ApiProperty({ example: 'usr_123' })
  authorId!: string;

  @ApiProperty({ example: 'Looks good' })
  content!: string;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class AssigneeIdsDto {
  @ApiProperty({ type: [String], example: ['usr_1', 'usr_2'] })
  assigneeIds!: string[];
}

class LabelIdsDto {
  @ApiProperty({ type: [String], example: ['label_1', 'label_2'] })
  labelIds!: string[];
}

class TicketChecklistItemDto {
  @ApiProperty({ example: 'item_123' })
  id!: string;

  @ApiProperty({ example: 'ticket_123' })
  ticketId!: string;

  @ApiProperty({ example: 'chk_123' })
  checklistId!: string;

  @ApiProperty({ example: 'Do the thing' })
  content!: string;

  @ApiProperty({ example: false })
  isDone!: boolean;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class TicketChecklistDto {
  @ApiProperty({ example: 'chk_123' })
  id!: string;

  @ApiProperty({ example: 'ticket_123' })
  ticketId!: string;

  @ApiProperty({ example: 'Release' })
  title!: string;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: [TicketChecklistItemDto] })
  items!: TicketChecklistItemDto[];
}

class TicketAttachmentDto {
  @ApiProperty({ example: 'att_123' })
  id!: string;

  @ApiProperty({ example: 'ticket_123' })
  ticketId!: string;

  @ApiProperty({ example: 'usr_123' })
  createdBy!: string;

  @ApiProperty({ example: 'spec.pdf' })
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiProperty({ example: 'boards/...' })
  objectPath!: string;

  @ApiProperty({ enum: ['pending', 'uploaded'] })
  status!: 'pending' | 'uploaded';

  @ApiProperty({ example: 12345, nullable: true })
  size!: number | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class AttachmentUploadResponseDto {
  @ApiProperty({ type: TicketAttachmentDto })
  attachment!: TicketAttachmentDto;

  @ApiProperty({ type: SignedUrlDto })
  upload!: SignedUrlDto;
}

class AttachmentDownloadResponseDto {
  @ApiProperty({ type: TicketAttachmentDto })
  attachment!: TicketAttachmentDto;

  @ApiProperty({ type: SignedUrlDto })
  download!: SignedUrlDto;
}

class PatchTicketDto {
  @ApiProperty({ required: false, example: 'Fix login' })
  title?: string;

  @ApiProperty({ required: false, example: 'Details' })
  description?: string;

  @ApiProperty({ required: false, example: '2024-01-10T10:00:00.000Z', nullable: true })
  dueDate?: string | null;
}

class CreateCommentDto {
  @ApiProperty({ required: false, example: 'Looks good' })
  content?: string;
}

class PatchCommentDto {
  @ApiProperty({ required: false, example: 'Looks great' })
  content?: string;
}

class AddAssigneeDto {
  @ApiProperty({ required: false, example: 'usr_123' })
  userId?: string;
}

class CreateChecklistDto {
  @ApiProperty({ required: false, example: 'Release' })
  title?: string;
}

class PatchChecklistDto {
  @ApiProperty({ required: false, example: 'Release' })
  title?: string;
}

class ReorderChecklistsDto {
  @ApiProperty({ required: false, type: [String], example: ['chk_1', 'chk_2'] })
  checklistIds?: string[];
}

class CreateChecklistItemDto {
  @ApiProperty({ required: false, example: 'Do the thing' })
  content?: string;
}

class PatchChecklistItemDto {
  @ApiProperty({ required: false, example: 'Do the thing' })
  content?: string;

  @ApiProperty({ required: false, example: true })
  isDone?: boolean;
}

class ReorderChecklistItemsDto {
  @ApiProperty({ required: false, type: [String], example: ['item_1', 'item_2'] })
  itemIds?: string[];
}

class AddLabelDto {
  @ApiProperty({ required: false, example: 'label_123' })
  labelId?: string;
}

class CreateAttachmentUploadUrlDto {
  @ApiProperty({ required: false, example: 'spec.pdf' })
  filename?: string;

  @ApiProperty({ required: false, example: 'application/pdf' })
  contentType?: string;

  @ApiProperty({ required: false, example: true })
  resumable?: boolean;
}

class CompleteAttachmentDto {
  @ApiProperty({ required: false, example: 12345 })
  size?: number;
}

@UseGuards(FirebaseAuthGuard)
@ApiTags('tickets')
@ApiBearerAuth('bearer')
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
  @ApiOkResponse({ type: TicketDetailsDto })
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
  @ApiBody({ type: PatchTicketDto })
  @ApiOkResponse({ type: TicketDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: [TicketCommentDto] })
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
  @ApiBody({ type: CreateCommentDto })
  @ApiOkResponse({ type: TicketCommentDto })
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
  @ApiBody({ type: PatchCommentDto })
  @ApiOkResponse({ type: TicketCommentDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: AssigneeIdsDto })
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
  @ApiBody({ type: AddAssigneeDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: LabelIdsDto })
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
  @ApiBody({ type: AddLabelDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: [TicketChecklistDto] })
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
  @ApiBody({ type: CreateChecklistDto })
  @ApiOkResponse({ type: TicketChecklistDto })
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
  @ApiBody({ type: ReorderChecklistsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiBody({ type: PatchChecklistDto })
  @ApiOkResponse({ type: TicketChecklistDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiBody({ type: CreateChecklistItemDto })
  @ApiOkResponse({ type: TicketChecklistItemDto })
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
  @ApiBody({ type: ReorderChecklistItemsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiBody({ type: PatchChecklistItemDto })
  @ApiOkResponse({ type: TicketChecklistItemDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: [TicketAttachmentDto] })
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
  @ApiBody({ type: CreateAttachmentUploadUrlDto })
  @ApiOkResponse({ type: AttachmentUploadResponseDto })
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
  @ApiBody({ type: CompleteAttachmentDto })
  @ApiOkResponse({ type: TicketAttachmentDto })
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
  @ApiOkResponse({ type: AttachmentDownloadResponseDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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


