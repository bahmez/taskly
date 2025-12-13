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
import { CurrentUser, FirebaseAuthGuard } from '@taskly/auth';
import type { UserModel, WorkspaceRole } from '@taskly/database';
import { UsersService, WorkspacesService } from '@taskly/database';
import { canAssignRole } from './permissions.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

type CreateWorkspaceDto = { title?: string; description?: string };
type PatchWorkspaceDto = { title?: string; description?: string };

type AddMemberDto = { userId?: string; role?: WorkspaceRole };
type PatchMemberDto = { role?: WorkspaceRole };

type CreateBoardDto = { title?: string; backgroundColor?: string | null };
type ReorderBoardsDto = { boardIds?: string[] };

type CreateInvitationDto = { role?: WorkspaceRole; expiresInDays?: number };

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
@Controller('/api/workspaces')
export class WorkspaceController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly users: UsersService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get()
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
  async create(@CurrentUser() user: UserModel, @Body() body: CreateWorkspaceDto) {
    const title = (body.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    const description = (body.description ?? '').trim();

    const ws = await this.workspaces.createWorkspace({ title, description });
    await this.workspaces.upsertMember(ws.id, user.id, 'admin');
    return ws;
  }

  @Get('/:workspaceId')
  async get(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.meta.read');

    const ws = await this.workspaces.getWorkspaceById(workspaceId);
    if (!ws || ws.isArchived) throw new NotFoundException('Workspace not found');

    const [membersCount, boards] = await Promise.all([
      this.workspaces.countMembers(workspaceId),
      this.workspaces.listBoards(workspaceId),
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
  async remove(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.meta.write');
    await this.workspaces.archiveWorkspace(workspaceId);
    return { ok: true };
  }

  // Members
  @Get('/:workspaceId/members')
  async members(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.read');
    return await this.workspaces.listMembers(workspaceId);
  }

  @Post('/:workspaceId/members')
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
  async boards(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.read');
    return await this.workspaces.listBoards(workspaceId);
  }

  @Post('/:workspaceId/boards')
  async createBoard(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateBoardDto,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.write');
    const title = (body.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    const backgroundColor = body.backgroundColor ?? null;
    return await this.workspaces.createBoard(workspaceId, { title, backgroundColor });
  }

  @Patch('/:workspaceId/boards/order')
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
      await this.workspaces.reorderBoards(workspaceId, boardIds);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return { ok: true };
  }

  @Delete('/:workspaceId/boards/:boardId')
  async removeBoard(
    @CurrentUser() user: UserModel,
    @Param('workspaceId') workspaceId: string,
    @Param('boardId') boardId: string,
  ) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.boards.write');
    await this.workspaces.archiveBoard(workspaceId, boardId);
    return { ok: true };
  }

  // Invitations
  @Post('/:workspaceId/invitations')
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
  async listInvitations(@CurrentUser() user: UserModel, @Param('workspaceId') workspaceId: string) {
    await this.access.requirePermission(workspaceId, user.id, 'workspace.members.write');
    return await this.workspaces.listPendingInvitations(workspaceId);
  }

  @Delete('/:workspaceId/invitations/:invitationId')
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


