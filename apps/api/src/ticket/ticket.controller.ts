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

type PatchTicketDto = {
  title?: string;
  description?: string;
  dueDate?: string | null;
};

type CreateCommentDto = { content?: string };
type PatchCommentDto = { content?: string };
type AddAssigneeDto = { userId?: string };

@UseGuards(FirebaseAuthGuard)
@Controller('/api/tickets')
export class TicketController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly users: UsersService,
    private readonly access: TicketAccessService,
  ) {}

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
}


