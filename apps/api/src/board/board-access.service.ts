/**
 * Board Access Control Service
 *
 * Provides authorization checks for board operations.
 * Verifies board existence, user workspace membership, and enforces role-based permissions.
 * 
 * Used by BoardController to ensure users have proper access to board resources.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BoardModel, WorkspaceRole } from '@taskly/database';
import { BoardsService, WorkspacesService } from '@taskly/database';
import { boardRolePermissions, hasPermission } from '@taskly/shared';

/**
 * Service for board-level access control.
 * Combines board and workspace checks with permission verification.
 */
@Injectable()
export class BoardAccessService {
  constructor(
    private readonly boards: BoardsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  /**
   * Retrieves a board by ID or throws an error if not found or archived.
   * @param boardId - The board ID
   * @returns The board model
   * @throws NotFoundException if board doesn't exist or is archived
   */
  async getBoardOrThrow(boardId: string): Promise<BoardModel> {
    const b = await this.boards.getBoardById(boardId);
    if (!b || b.isArchived) throw new NotFoundException('Board not found');
    return b;
  }

  /**
   * Retrieves a user's workspace role or throws an error if not a member.
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @returns The user's role in the workspace
   * @throws ForbiddenException if user is not a workspace member
   */
  async getWorkspaceRoleOrThrow(userId: string, workspaceId: string): Promise<WorkspaceRole> {
    const member = await this.workspaces.getMember(workspaceId, userId);
    if (!member) throw new ForbiddenException('Not a workspace member');
    return member.role;
  }

  /**
   * Verifies that a role has a required permission.
   * Throws if permission check fails.
   * 
   * @param role - The user's workspace role
   * @param required - The required permission string (e.g., 'board.meta.write')
   * @throws ForbiddenException if permission is not granted
   */
  requirePermission(role: WorkspaceRole, required: string): void {
    const grants = boardRolePermissions[role] ?? [];
    if (!hasPermission(grants, required)) throw new ForbiddenException('Missing permission');
  }

  /**
   * Checks if a role has a required permission without throwing.
   * Useful for conditional logic (e.g., hiding/showing fields).
   * 
   * @param role - The user's workspace role
   * @param required - The required permission string
   * @returns true if permission is granted, false otherwise
   */
  has(role: WorkspaceRole, required: string): boolean {
    const grants = boardRolePermissions[role] ?? [];
    return hasPermission(grants, required);
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


