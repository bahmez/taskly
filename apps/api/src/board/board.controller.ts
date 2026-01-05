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
import type { UserModel } from '@taskly/database';
import { BoardsService } from '@taskly/database';
import { BoardAccessService } from './board-access.service.js';

type PatchBoardDto = { title?: string; description?: string; background?: string | null };
type CreateColumnDto = { title?: string; key?: string };
type PatchColumnDto = { title?: string; key?: string };
type ReorderColumnsDto = { columnIds?: string[] };
type MoveTicketDto = { columnId?: string; position?: number };
type CreateLabelDto = { name?: string; color?: string | null };
type PatchLabelDto = { name?: string; color?: string | null };
type ReorderLabelsDto = { labelIds?: string[] };

@UseGuards(FirebaseAuthGuard)
@Controller('/api/boards')
export class BoardController {
  constructor(
    private readonly boards: BoardsService,
    private readonly access: BoardAccessService,
  ) {}

  @Get('/:boardId')
  async getBoard(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.read');

    // Optional stats only if allowed
    const canColumnsRead = this.access.has(role, 'board.columns.read');
    const canTicketsRead = this.access.has(role, 'board.tickets.read');
    const [columns, tickets] = await Promise.all([
      canColumnsRead ? this.boards.listColumns(boardId) : Promise.resolve([]),
      canTicketsRead ? this.boards.listTickets(boardId) : Promise.resolve([]),
    ]);

    return {
      id: board.id,
      workspaceId: board.workspaceId,
      title: board.title,
      description: board.description,
      background: board.background,
      order: board.order,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      stats: {
        columnsCount: canColumnsRead ? columns.length : null,
        ticketsCount: canTicketsRead ? tickets.length : null,
      },
    };
  }

  @Patch('/:boardId')
  async patchBoard(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Body() body: PatchBoardDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');

    const patch: { title?: string; description?: string; background?: string | null } = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) throw new BadRequestException('title cannot be empty');
      patch.title = t;
    }
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (body.background === null || typeof body.background === 'string') patch.background = body.background;

    return await this.boards.updateBoard(boardId, patch);
  }

  // Columns
  @Get('/:boardId/columns')
  async listColumns(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.read');
    return await this.boards.listColumns(boardId);
  }

  @Post('/:boardId/columns')
  async createColumn(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Body() body: CreateColumnDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.write');

    const title = (body.title ?? '').trim();
    const key = (body.key ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    if (!key) throw new BadRequestException('key is required');

    return await this.boards.createColumn(boardId, { title, key });
  }

  @Patch('/:boardId/columns/:columnId')
  async patchColumn(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() body: PatchColumnDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.write');

    const patch: { title?: string; key?: string } = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) throw new BadRequestException('title cannot be empty');
      patch.title = t;
    }
    if (typeof body.key === 'string') {
      const k = body.key.trim();
      if (!k) throw new BadRequestException('key cannot be empty');
      patch.key = k;
    }
    return await this.boards.updateColumn(boardId, columnId, patch);
  }

  @Delete('/:boardId/columns/:columnId')
  async deleteColumn(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.write');
    try {
      await this.boards.deleteColumn(boardId, columnId);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { ok: true };
  }

  @Patch('/:boardId/columns/order')
  async reorderColumns(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Body() body: ReorderColumnsDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.write');

    const columnIds = body.columnIds ?? [];
    if (!Array.isArray(columnIds) || columnIds.length === 0) throw new BadRequestException('columnIds is required');
    if (new Set(columnIds).size !== columnIds.length) throw new BadRequestException('columnIds must be unique');
    try {
      await this.boards.reorderColumns(boardId, columnIds);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { ok: true };
  }

  // Labels
  @Get('/:boardId/labels')
  async listLabels(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.read');
    return await this.boards.listLabels(boardId);
  }

  @Post('/:boardId/labels')
  async createLabel(@CurrentUser() user: UserModel, @Param('boardId') boardId: string, @Body() body: CreateLabelDto) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');

    const name = (body.name ?? '').trim();
    if (!name) throw new BadRequestException('name is required');

    let color: string | null | undefined = body.color;
    if (typeof color === 'string') {
      const c = color.trim();
      if (c) {
        const hex = c.startsWith('#') ? c.slice(1) : c;
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new BadRequestException('color must be a 6-digit hex code');
        color = `#${hex.toUpperCase()}`;
      } else {
        color = undefined;
      }
    }

    return await this.boards.createLabel(boardId, { name, color });
  }

  @Patch('/:boardId/labels/order')
  async reorderLabels(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Body() body: ReorderLabelsDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');

    const labelIds = body.labelIds ?? [];
    if (!Array.isArray(labelIds) || labelIds.length === 0) throw new BadRequestException('labelIds is required');
    if (new Set(labelIds).size !== labelIds.length) throw new BadRequestException('labelIds must be unique');

    try {
      await this.boards.reorderLabels(boardId, labelIds);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { ok: true };
  }

  @Patch('/:boardId/labels/:labelId')
  async patchLabel(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('labelId') labelId: string,
    @Body() body: PatchLabelDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');

    const patch: { name?: string; color?: string } = {};
    if (typeof body.name === 'string') {
      const n = body.name.trim();
      if (!n) throw new BadRequestException('name cannot be empty');
      patch.name = n;
    }
    if (body.color === null || typeof body.color === 'string') {
      const c = (body.color ?? '').trim();
      if (!c) throw new BadRequestException('color cannot be empty (omit it to keep unchanged)');
      const hex = c.startsWith('#') ? c.slice(1) : c;
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new BadRequestException('color must be a 6-digit hex code');
      patch.color = `#${hex.toUpperCase()}`;
    }
    if (Object.keys(patch).length === 0) throw new BadRequestException('Nothing to update');

    return await this.boards.updateLabel(boardId, labelId, patch);
  }

  @Delete('/:boardId/labels/:labelId')
  async deleteLabel(@CurrentUser() user: UserModel, @Param('boardId') boardId: string, @Param('labelId') labelId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');
    await this.boards.deleteLabel(boardId, labelId);
    return { ok: true };
  }

  // Tickets
  @Get('/:boardId/tickets')
  async listTickets(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.tickets.read');

    const canReadContent = this.access.has(role, 'ticket.content.read');
    const tickets = await this.boards.listTickets(boardId);
    return tickets.map((t) => ({
      id: t.id,
      boardId: t.boardId,
      columnId: t.columnId,
      title: t.title,
      description: canReadContent ? t.description : undefined,
      labelIds: t.labelIds,
      position: t.position,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  @Get('/:boardId/columns/:columnId/tickets')
  async listTicketsByColumn(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.tickets.read');

    const canReadContent = this.access.has(role, 'ticket.content.read');
    const tickets = await this.boards.listTicketsByColumn(boardId, columnId);
    return tickets.map((t) => ({
      id: t.id,
      boardId: t.boardId,
      columnId: t.columnId,
      title: t.title,
      description: canReadContent ? t.description : undefined,
      labelIds: t.labelIds,
      position: t.position,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  @Patch('/:boardId/tickets/:ticketId/move')
  async moveTicket(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('ticketId') ticketId: string,
    @Body() body: MoveTicketDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.tickets.write');

    const columnId = (body.columnId ?? '').trim();
    const position = Number(body.position);
    if (!columnId) throw new BadRequestException('columnId is required');
    if (!Number.isFinite(position)) throw new BadRequestException('position is required');
    try {
      await this.boards.moveTicket(boardId, ticketId, { columnId, position });
    } catch (e) {
      const msg = (e as Error).message || 'Move failed';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }

  @Delete('/:boardId/tickets/:ticketId')
  async deleteTicket(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.tickets.write');
    await this.boards.archiveTicket(boardId, ticketId);
    return { ok: true };
  }
}


