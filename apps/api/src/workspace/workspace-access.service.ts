/**
 * Workspace Access Control Service
 *
 * Provides authorization checks for workspace operations.
 * Verifies workspace membership, validates user roles, and enforces permissions.
 * 
 * Used by WorkspaceController to ensure only authorized users can access resources.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceMemberModel, WorkspaceModel, WorkspaceRole } from '@taskly/database';
import { WorkspacesService } from '@taskly/database';
import { hasPermission, workspaceRolePermissions } from './permissions.js';

/**
 * Service for workspace-level access control.
 * Handles permission checking and membership verification.
 */
@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly workspaces: WorkspacesService) {}

  /**
   * Retrieves a workspace by ID or throws an error if not found or archived.
   * @param workspaceId - The workspace ID
   * @returns The workspace model
   * @throws NotFoundException if workspace doesn't exist or is archived
   */
  async getWorkspaceOrThrow(workspaceId: string): Promise<WorkspaceModel> {
    const ws = await this.workspaces.getWorkspaceById(workspaceId);
    if (!ws || ws.isArchived) throw new NotFoundException('Workspace not found');
    return ws;
  }

  /**
   * Retrieves a workspace member by ID or throws an error if not found.
   * @param workspaceId - The workspace ID
   * @param userId - The user ID
   * @returns The workspace member model
   * @throws ForbiddenException if user is not a member of the workspace
   */
  async getMemberOrThrow(workspaceId: string, userId: string): Promise<WorkspaceMemberModel> {
    const m = await this.workspaces.getMember(workspaceId, userId);
    if (!m) throw new ForbiddenException('Not a workspace member');
    return m;
  }

  /**
   * Verifies that a user has a required permission in a workspace.
   * Combines workspace and member retrieval with permission checking.
   * 
   * @param workspaceId - The workspace ID
   * @param userId - The user ID to check permissions for
   * @param required - The required permission string (e.g., 'workspace.boards.read')
   * @returns Object containing workspace, member, and their role
   * @throws NotFoundException if workspace not found or archived
   * @throws ForbiddenException if user is not a member or lacks permission
   * 
   * @example
   * const { role } = await accessService.requirePermission(
   *   'workspace-123',
   *   'user-456',
   *   'workspace.members.write'
   * );
   */
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

  /**
   * Validates that an ID is not empty or whitespace-only.
   * Useful for defensive parameter validation.
   * 
   * @param id - The ID to validate
   * @param label - Human-readable field name for error messages (default 'id')
   * @throws BadRequestException if ID is empty or whitespace
   */
  assertNonEmptyId(id: string, label = 'id') {
    if (!id || !id.trim()) throw new BadRequestException(`Missing ${label}`);
  }
}


