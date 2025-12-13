import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceMemberModel, WorkspaceModel, WorkspaceRole } from '@taskly/database';
import { WorkspacesService } from '@taskly/database';
import { hasPermission, workspaceRolePermissions } from './permissions.js';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly workspaces: WorkspacesService) {}

  async getWorkspaceOrThrow(workspaceId: string): Promise<WorkspaceModel> {
    const ws = await this.workspaces.getWorkspaceById(workspaceId);
    if (!ws || ws.isArchived) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async getMemberOrThrow(workspaceId: string, userId: string): Promise<WorkspaceMemberModel> {
    const m = await this.workspaces.getMember(workspaceId, userId);
    if (!m) throw new ForbiddenException('Not a workspace member');
    return m;
  }

  async requirePermission(
    workspaceId: string,
    userId: string,
    required: string,
  ): Promise<{ workspace: WorkspaceModel; member: WorkspaceMemberModel; role: WorkspaceRole }> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    const member = await this.getMemberOrThrow(workspaceId, userId);
    const role = member.role;
    const grants = workspaceRolePermissions[role] ?? [];
    if (!hasPermission(grants, required)) {
      throw new ForbiddenException('Missing permission');
    }
    return { workspace, member, role };
  }

  assertNonEmptyId(id: string, label = 'id') {
    if (!id || !id.trim()) throw new BadRequestException(`Missing ${label}`);
  }
}


