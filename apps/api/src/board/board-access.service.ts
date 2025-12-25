import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BoardModel, UserModel, WorkspaceRole } from '@taskly/database';
import { BoardsService, WorkspacesService } from '@taskly/database';
import { boardRolePermissions, hasPermission } from '@taskly/shared';

@Injectable()
export class BoardAccessService {
  constructor(
    private readonly boards: BoardsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async getBoardOrThrow(boardId: string): Promise<BoardModel> {
    const b = await this.boards.getBoardById(boardId);
    if (!b || b.isArchived) throw new NotFoundException('Board not found');
    return b;
  }

  async getWorkspaceRoleOrThrow(userId: string, workspaceId: string): Promise<WorkspaceRole> {
    const member = await this.workspaces.getMember(workspaceId, userId);
    if (!member) throw new ForbiddenException('Not a workspace member');
    return member.role;
  }

  requirePermission(role: WorkspaceRole, required: string): void {
    const grants = boardRolePermissions[role] ?? [];
    if (!hasPermission(grants, required)) throw new ForbiddenException('Missing permission');
  }

  has(role: WorkspaceRole, required: string): boolean {
    const grants = boardRolePermissions[role] ?? [];
    return hasPermission(grants, required);
  }

  assertNonEmptyId(id: string, label = 'id') {
    if (!id || !id.trim()) throw new BadRequestException(`Missing ${label}`);
  }
}


