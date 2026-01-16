import crypto from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, FirebaseAuthGuard } from '@taskly/auth';
import type { BoardBackground, UserModel, WorkspaceRole } from '@taskly/database';
import { BoardsService, UsersService, WorkspacesService } from '@taskly/database';
import { canAssignRole } from './permissions.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

class WorkspaceListItemDto {
  @ApiProperty({ example: 'ws_123' })
  id!: string;

  @ApiProperty({ example: 'Acme Workspace' })
  title!: string;

  @ApiProperty({ example: 'Main team workspace' })
  description!: string;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class WorkspaceStatsDto {
  @ApiProperty({ example: 5 })
  membersCount!: number;

  @ApiProperty({ example: 12 })
  boardsCount!: number;
}

class WorkspaceDetailsDto {
  @ApiProperty({ example: 'ws_123' })
  id!: string;

  @ApiProperty({ example: 'Acme Workspace' })
  title!: string;

  @ApiProperty({ example: 'Main team workspace' })
  description!: string;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: WorkspaceStatsDto })
  stats!: WorkspaceStatsDto;
}

class WorkspaceDto {
  @ApiProperty({ example: 'ws_123' })
  id!: string;

  @ApiProperty({ example: 'Acme Workspace' })
  title!: string;

  @ApiProperty({ example: 'Main team workspace' })
  description!: string;

  @ApiProperty({ example: false })
  isArchived!: boolean;

  @ApiProperty({ example: null, nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class WorkspaceMemberDto {
  @ApiProperty({ example: 'usr_123' })
  userId!: string;

  @ApiProperty({ enum: ['admin', 'maintainer', 'editor', 'viewer'] })
  role!: WorkspaceRole;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class WorkspaceInvitationDto {
  @ApiProperty({ example: 'inv_123' })
  id!: string;

  @ApiProperty({ example: 'ws_123' })
  workspaceId!: string;

  @ApiProperty({ example: 'token_abc' })
  token!: string;

  @ApiProperty({ enum: ['admin', 'maintainer', 'editor', 'viewer'] })
  role!: WorkspaceRole;

  @ApiProperty({ example: 'usr_123' })
  createdBy!: string;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-08T10:00:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ example: null, nullable: true })
  acceptedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  acceptedBy!: string | null;

  @ApiProperty({ example: null, nullable: true })
  declinedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  declinedBy!: string | null;

  @ApiProperty({ example: null, nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  cancelledBy!: string | null;
}

class WorkspaceInvitationWithUrlDto extends WorkspaceInvitationDto {
  @ApiProperty({ example: 'https://app.taskly.dev/invite/token_abc', nullable: true })
  inviteUrl!: string | null;
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

class CreateWorkspaceDto {
  @ApiProperty({ required: false, example: 'Acme Workspace' })
  title?: string;

  @ApiProperty({ required: false, example: 'Main team workspace' })
  description?: string;
}

class PatchWorkspaceDto {
  @ApiProperty({ required: false, example: 'Acme Workspace' })
  title?: string;

  @ApiProperty({ required: false, example: 'Main team workspace' })
  description?: string;
}

class AddMemberDto {
  @ApiProperty({ required: false, example: 'usr_123' })
  userId?: string;

  @ApiProperty({ required: false, enum: ['admin', 'maintainer', 'editor', 'viewer'] })
  role?: WorkspaceRole;
}

class PatchMemberDto {
  @ApiProperty({ required: false, enum: ['admin', 'maintainer', 'editor', 'viewer'] })
  role?: WorkspaceRole;
}

class CreateBoardDto {
  @ApiProperty({ required: false, example: 'Roadmap' })
  title?: string;

  @ApiProperty({
    required: false,
    description: 'Board background as object or string.',
    type: 'object',
  })
  background?: BoardBackground | string | null;

  @ApiProperty({
    required: false,
    description: 'Legacy background color (hex or CSS).',
    example: '#FFAA00',
  })
  backgroundColor?: string | null;
}

class ReorderBoardsDto {
  @ApiProperty({ required: false, type: [String], example: ['board_1', 'board_2'] })
  boardIds?: string[];
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

class CreateInvitationDto {
  @ApiProperty({ required: false, enum: ['admin', 'maintainer', 'editor', 'viewer'] })
  role?: WorkspaceRole;

  @ApiProperty({ required: false, example: 7 })
  expiresInDays?: number;
}

function asRole(x: unknown): WorkspaceRole | null {
  if (x === 'admin' || x === 'maintainer' || x === 'editor' || x === 'viewer') return x;
  return null;
}

function randomToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

@UseGuards(FirebaseAuthGuard)
@ApiTags('workspaces')
@ApiBearerAuth('bearer')
@Controller('/api/workspaces')
export class WorkspaceController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly boardsService: BoardsService,
    private readonly users: UsersService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [WorkspaceListItemDto] })
  async list(@CurrentUser() user: UserModel) {
    // Any member role includes workspace.meta.read per mapping.
    const workspaces = await this.workspaces.listWorkspacesForUser(user.id);
    return workspaces.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  @Post()
  @ApiBody({ type: CreateWorkspaceDto })
  @ApiOkResponse({ type: WorkspaceDto })
  async create(@CurrentUser() user: UserModel, @Body() body: CreateWorkspaceDto) {
    const title = (body.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    const description = (body.description ?? '').trim();

    const ws = await this.workspaces.createWorkspace({ title, description });
    await this.workspaces.upsertMember(ws.id, user.id, 'admin');
    return ws;
  }

  @Get('/:workspaceId')
  @ApiOkResponse({ type: WorkspaceDetailsDto })
  async get(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.meta.read');

    const ws = await this.workspaces.getWorkspaceById(workspaceId);
    if (!ws || ws.isArchived) throw new NotFoundException('Workspace not found');

    const [membersCount, boards] = await Promise.all([
      this.workspaces.countMembers(workspaceId),
      this.boardsService.listBoardsForWorkspace(workspaceId),
    ]);

    return {
      id: ws.id,
      title: ws.title,
      description: ws.description,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
      stats: {
        membersCount,
        boardsCount: boards.length,
      },
    };
  }

  @Patch('/:workspaceId')
  @ApiBody({ type: PatchWorkspaceDto })
  @ApiOkResponse({ type: WorkspaceDto })
  async patch(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: PatchWorkspaceDto,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.meta.write');
    const patch: { title?: string; description?: string } = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) throw new BadRequestException('title cannot be empty');
      patch.title = title;
    }
    if (typeof body.description === 'string') {
      patch.description = body.description.trim();
    }

    return await this.workspaces.updateWorkspace(workspaceId, patch);
  }

  @Delete('/:workspaceId')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async remove(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.meta.write');
    await this.workspaces.archiveWorkspace(workspaceId);
    return { ok: true };
  }

  // Members
  @Get('/:workspaceId/members')
  @ApiOkResponse({ type: [WorkspaceMemberDto] })
  async members(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.read');
    return await this.workspaces.listMembers(workspaceId);
  }

  @Post('/:workspaceId/members')
  @ApiBody({ type: AddMemberDto })
  @ApiOkResponse({ type: WorkspaceMemberDto })
  async addMember(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: AddMemberDto,
  ) {
    const { role: actorRole } = await this.access.requirePermission(
      workspaceId,
      user.id,
      'workspace.members.write',
    );

    const targetUserId = (body.userId ?? '').trim();
    if (!targetUserId) throw new BadRequestException('userId is required');
    const role = asRole(body.role) ?? null;
    if (!role) throw new BadRequestException('role is required');

    if (!canAssignRole(actorRole, role)) {
      throw new ForbiddenException('Cannot assign this role');
    }

    const exists = await this.users.getById(targetUserId);
    if (!exists) throw new NotFoundException('User not found');

    return await this.workspaces.upsertMember(workspaceId, targetUserId, role);
  }

  @Patch('/:workspaceId/members/:userId')
  @ApiBody({ type: PatchMemberDto })
  @ApiOkResponse({ type: WorkspaceMemberDto })
  async patchMember(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() body: PatchMemberDto,
  ) {
    const { role: actorRole } = await this.access.requirePermission(
      workspaceId,
      user.id,
      'workspace.members.write',
    );

    const role = asRole(body.role) ?? null;
    if (!role) throw new BadRequestException('role is required');

    if (!canAssignRole(actorRole, role)) {
      throw new ForbiddenException('Cannot assign this role');
    }

    const before = await this.workspaces.getMember(workspaceId, targetUserId);
    if (!before) throw new NotFoundException('Member not found');

    if (before.role === 'admin' && role !== 'admin') {
      const admins = await this.workspaces.countAdmins(workspaceId);
      if (admins <= 1) throw new BadRequestException('Cannot remove the last admin');
    }

    return await this.workspaces.upsertMember(workspaceId, targetUserId, role);
  }

  @Delete('/:workspaceId/members/:userId')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async removeMember(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.write');

    const before = await this.workspaces.getMember(workspaceId, targetUserId);
    if (!before) throw new NotFoundException('Member not found');

    if (before.role === 'admin') {
      const admins = await this.workspaces.countAdmins(workspaceId);
      if (admins <= 1) throw new BadRequestException('Cannot remove the last admin');
    }

    await this.workspaces.removeMember(workspaceId, targetUserId);
    return { ok: true };
  }

  // Boards
  @Get('/:workspaceId/boards')
  @ApiOkResponse({ type: [BoardDto] })
  async boards(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.read');
    return await this.boardsService.listBoardsForWorkspace(workspaceId);
  }

  @Post('/:workspaceId/boards')
  @ApiBody({ type: CreateBoardDto })
  @ApiOkResponse({ type: BoardDto })
  async createBoard(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateBoardDto,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.write');
    const title = (body.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    const legacyColor = (body.backgroundColor ?? '').trim();
    const background: BoardBackground | null = Object.prototype.hasOwnProperty.call(body, 'background')
      ? parseBoardBackgroundInput(body.background)
      : legacyColor
        ? ({ type: 'color', value: legacyColor } satisfies BoardBackground)
        : null;
    return await this.boardsService.createBoard({
      workspaceId,
      title,
      background,
    });
  }

  @Patch('/:workspaceId/boards/order')
  @ApiBody({ type: ReorderBoardsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async reorderBoards(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: ReorderBoardsDto,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.write');
    const boardIds = body.boardIds ?? [];
    if (!Array.isArray(boardIds) || boardIds.length === 0) {
      throw new BadRequestException('boardIds is required');
    }
    if (new Set(boardIds).size !== boardIds.length) {
      throw new BadRequestException('boardIds must be unique');
    }
    try {
      await this.boardsService.reorderBoards(workspaceId, boardIds);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { ok: true };
  }

  @Delete('/:workspaceId/boards/:boardId')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async removeBoard(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Param('boardId') boardId: string,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.write');
    // will also stop appearing in /workspaces/:id/boards
    await this.boardsService.archiveBoard(boardId);
    return { ok: true };
  }

  // Invitations
  @Post('/:workspaceId/invitations')
  @ApiBody({ type: CreateInvitationDto })
  @ApiOkResponse({ type: WorkspaceInvitationWithUrlDto })
  async createInvitation(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateInvitationDto,
  ) {
    const { role: actorRole } = await this.access.requirePermission(
      workspaceId,
      user.id,
      'workspace.members.write',
    );

    const role = asRole(body.role) ?? 'viewer';
    if (!canAssignRole(actorRole, role)) throw new ForbiddenException('Cannot invite with this role');

    const expiresInDays = Number.isFinite(body.expiresInDays) ? Number(body.expiresInDays) : 7;
    const days = Math.min(Math.max(expiresInDays, 1), 30);
    const token = randomToken();
    const invitation = await this.workspaces.createInvitation(workspaceId, {
      token,
      role,
      createdBy: user.id,
      expiresAt: addDaysIso(days),
    });

    const base = process.env.WEB_ORIGIN ?? process.env.CORS_ORIGIN ?? '';
    const inviteUrl = base ? `${base.replace(/\/$/, '')}/invite/${token}` : null;
    return { ...invitation, inviteUrl };
  }

  @Get('/:workspaceId/invitations')
  @ApiOkResponse({ type: [WorkspaceInvitationDto] })
  async listInvitations(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.write');
    return await this.workspaces.listPendingInvitations(workspaceId);
  }

  @Delete('/:workspaceId/invitations/:invitationId')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  async cancelInvitation(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.write');
    const inv = await this.workspaces.getInvitation(workspaceId, invitationId);
    if (!inv) throw new NotFoundException('Invitation not found');
    await this.workspaces.cancelInvitation(workspaceId, invitationId, user.id);
    return { ok: true };
  }

  @Post('/invitations/:token/accept')
  @ApiOkResponse({ type: WorkspaceMemberDto })
  async accept(@CurrentUser() user: UserModel, @Param('token') token: string) {
    const t = (token ?? '').trim();
    if (!t) throw new BadRequestException('token is required');
    try {
      return await this.workspaces.acceptInvitationByToken(t, user.id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('/invitations/:token/decline')
  @ApiOkResponse({ type: WorkspaceInvitationDto })
  async decline(@CurrentUser() user: UserModel, @Param('token') token: string) {
    const t = (token ?? '').trim();
    if (!t) throw new BadRequestException('token is required');
    try {
      return await this.workspaces.declineInvitationByToken(t, user.id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}


