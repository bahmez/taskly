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
import type { BoardBackground, UserModel } from '@taskly/database';
import { BoardsService } from '@taskly/database';
import { BoardAccessService } from './board-access.service.js';

class BoardStatsDto {
  @ApiProperty({ example: 5, nullable: true })
  columnsCount!: number | null;

  @ApiProperty({ example: 42, nullable: true })
  ticketsCount!: number | null;
}

class BoardDto {
  @ApiProperty({ example: 'board_123' })
  id!: string;

  @ApiProperty({ example: 'ws_123' })
  workspaceId!: string;

  @ApiProperty({ example: 'Roadmap' })
  title!: string;

  @ApiProperty({ example: 'Product roadmap' })
  description!: string;

  @ApiProperty({ type: 'object', nullable: true })
  background!: BoardBackground | null;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: false })
  isArchived!: boolean;

  @ApiProperty({ example: null, nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class BoardDetailsDto {
  @ApiProperty({ example: 'board_123' })
  id!: string;

  @ApiProperty({ example: 'ws_123' })
  workspaceId!: string;

  @ApiProperty({ example: 'Roadmap' })
  title!: string;

  @ApiProperty({ example: 'Product roadmap' })
  description!: string;

  @ApiProperty({ type: 'object', nullable: true })
  background!: BoardBackground | null;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: BoardStatsDto })
  stats!: BoardStatsDto;
}

class BoardColumnDto {
  @ApiProperty({ example: 'col_123' })
  id!: string;

  @ApiProperty({ example: 'board_123' })
  boardId!: string;

  @ApiProperty({ example: 'Todo' })
  title!: string;

  @ApiProperty({ example: 'todo' })
  key!: string;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class BoardLabelDto {
  @ApiProperty({ example: 'label_123' })
  id!: string;

  @ApiProperty({ example: 'board_123' })
  boardId!: string;

  @ApiProperty({ example: 'Urgent' })
  name!: string;

  @ApiProperty({ example: '#FF0000' })
  color!: string;

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class TicketListItemDto {
  @ApiProperty({ example: 'ticket_123' })
  id!: string;

  @ApiProperty({ example: 'board_123' })
  boardId!: string;

  @ApiProperty({ example: 'col_123' })
  columnId!: string;

  @ApiProperty({ example: 'Fix login' })
  title!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Details' })
  description?: string;

  @ApiProperty({ type: [String], example: ['label_1', 'label_2'] })
  labelIds!: string[];

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class PatchBoardDto {
  @ApiProperty({ required: false, example: 'Roadmap' })
  title?: string;

  @ApiProperty({ required: false, example: 'Product roadmap' })
  description?: string;

  @ApiProperty({ required: false, type: 'object', nullable: true })
  background?: BoardBackground | string | null;
}

class CreateColumnDto {
  @ApiProperty({ required: false, example: 'Todo' })
  title?: string;

  @ApiProperty({ required: false, example: 'todo' })
  key?: string;
}

class PatchColumnDto {
  @ApiProperty({ required: false, example: 'Todo' })
  title?: string;

  @ApiProperty({ required: false, example: 'todo' })
  key?: string;
}

class ReorderColumnsDto {
  @ApiProperty({ required: false, type: [String], example: ['col_1', 'col_2'] })
  columnIds?: string[];
}

class MoveTicketDto {
  @ApiProperty({ required: false, example: 'col_123' })
  columnId?: string;

  @ApiProperty({ required: false, example: 3 })
  position?: number;
}

class CreateLabelDto {
  @ApiProperty({ required: false, example: 'Urgent' })
  name?: string;

  @ApiProperty({ required: false, example: '#FF0000', nullable: true })
  color?: string | null;
}

class PatchLabelDto {
  @ApiProperty({ required: false, example: 'Urgent' })
  name?: string;

  @ApiProperty({ required: false, example: '#FF0000', nullable: true })
  color?: string | null;
}

class ReorderLabelsDto {
  @ApiProperty({ required: false, type: [String], example: ['label_1', 'label_2'] })
  labelIds?: string[];
}

function parseBoardBackgroundInput(input: unknown): BoardBackground | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') {
    const value = input.trim();
    if (!value) return null;
    return { type: 'color', value };
  }
  if (typeof input !== 'object') return null;
  const data = input as { type?: unknown; value?: unknown };
  if (data.type === 'color' || data.type === 'gradient') {
    if (typeof data.value !== 'string') return null;
    const value = data.value.trim();
    if (!value) return null;
    return { type: data.type, value };
  }
  if (data.type === 'image') {
    if (typeof data.value !== 'object' || !data.value) return null;
    const value = data.value as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id : '';
    const url = typeof value.url === 'string' ? value.url : '';
    const thumbUrl = typeof value.thumbUrl === 'string' ? value.thumbUrl : '';
    if (!id || !url || !thumbUrl) return null;
    return {
      type: 'image',
      value: {
        source: value.source === 'unsplash' ? 'unsplash' : 'unsplash',
        id,
        url,
        thumbUrl,
        blurHash: typeof value.blurHash === 'string' ? value.blurHash : null,
        color: typeof value.color === 'string' ? value.color : null,
        authorName: typeof value.authorName === 'string' ? value.authorName : null,
        authorUrl: typeof value.authorUrl === 'string' ? value.authorUrl : null,
      },
    };
  }
  return null;
}

@UseGuards(FirebaseAuthGuard)
@ApiTags('boards')
@ApiBearerAuth('bearer')
@Controller('/api/boards')
export class BoardController {
  constructor(
    private readonly boards: BoardsService,
    private readonly access: BoardAccessService,
  ) {}

  @Get('/:boardId')
  @ApiOkResponse({ type: BoardDetailsDto })
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
  @ApiBody({ type: PatchBoardDto })
  @ApiOkResponse({ type: BoardDto })
  async patchBoard(
    @CurrentUser() user: UserModel,
    @Param('boardId') boardId: string,
    @Body() body: PatchBoardDto,
  ) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');

    const patch: { title?: string; description?: string; background?: BoardBackground | null } = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) throw new BadRequestException('title cannot be empty');
      patch.title = t;
    }
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (Object.prototype.hasOwnProperty.call(body, 'background')) {
      if (body.background === null) {
        patch.background = null;
      } else {
        const parsed = parseBoardBackgroundInput(body.background);
        if (!parsed) throw new BadRequestException('background is invalid');
        patch.background = parsed;
      }
    }

    return await this.boards.updateBoard(boardId, patch);
  }

  // Columns
  @Get('/:boardId/columns')
  @ApiOkResponse({ type: [BoardColumnDto] })
  async listColumns(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.columns.read');
    return await this.boards.listColumns(boardId);
  }

  @Post('/:boardId/columns')
  @ApiBody({ type: CreateColumnDto })
  @ApiOkResponse({ type: BoardColumnDto })
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
  @ApiBody({ type: PatchColumnDto })
  @ApiOkResponse({ type: BoardColumnDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiBody({ type: ReorderColumnsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({ type: [BoardLabelDto] })
  async listLabels(@CurrentUser() user: UserModel, @Param('boardId') boardId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.read');
    return await this.boards.listLabels(boardId);
  }

  @Post('/:boardId/labels')
  @ApiBody({ type: CreateLabelDto })
  @ApiOkResponse({ type: BoardLabelDto })
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
  @ApiBody({ type: ReorderLabelsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiBody({ type: PatchLabelDto })
  @ApiOkResponse({ type: BoardLabelDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async deleteLabel(@CurrentUser() user: UserModel, @Param('boardId') boardId: string, @Param('labelId') labelId: string) {
    const board = await this.access.getBoardOrThrow(boardId);
    const role = await this.access.getWorkspaceRoleOrThrow(user.id, board.workspaceId);
    this.access.requirePermission(role, 'board.meta.write');
    await this.boards.deleteLabel(boardId, labelId);
    return { ok: true };
  }

  // Tickets
  @Get('/:boardId/tickets')
  @ApiOkResponse({ type: [TicketListItemDto] })
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
  @ApiOkResponse({ type: [TicketListItemDto] })
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
  @ApiBody({ type: MoveTicketDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
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


