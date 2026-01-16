/**
 * Ticket Access Control Service
 *
 * Provides authorization checks for ticket operations.
 * Verifies ticket existence, derives workspace from board, and enforces role-based permissions.
 * 
 * Used by TicketController to ensure users have proper access to ticket resources
 * and can perform actions like viewing content, managing comments, or handling attachments.
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { TicketModel, WorkspaceRole } from '@taskly/database';
import { BoardsService, TicketsService, WorkspacesService } from '@taskly/database';
import { hasPermission, ticketRolePermissions } from '@taskly/shared';

/**
 * Service for ticket-level access control.
 * Resolves ticket -> board -> workspace hierarchy to determine user permissions.
 */
@Injectable()
export class TicketAccessService {
  constructor(
    private readonly tickets: TicketsService,
    private readonly boards: BoardsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  /**
   * Retrieves a ticket by ID or throws an error if not found.
   * @param ticketId - The ticket ID
   * @returns The ticket model
   * @throws NotFoundException if ticket doesn't exist
   */
  async getTicketOrThrow(ticketId: string): Promise<TicketModel> {
    const t = await this.tickets.getById(ticketId);
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  /**
   * Determines a user's workspace role by tracing through ticket -> board -> workspace hierarchy.
   * Verifies that ticket's board exists and user is a workspace member.
   * 
   * @param userId - The user ID
   * @param ticket - The ticket model
   * @returns Object containing user's role and workspace ID
   * @throws NotFoundException if board doesn't exist or is archived
   * @throws ForbiddenException if user is not a workspace member
   * 
   * @example
   * const { role, workspaceId } = await ticketAccessService.getWorkspaceRoleForTicketOrThrow(
   *   userId,
   *   ticket
   * );
   */
  async getWorkspaceRoleForTicketOrThrow(
    userId: string,
    ticket: TicketModel,
  ): Promise<{ role: WorkspaceRole; workspaceId: string }> {
    const board = await this.boards.getBoardById(ticket.boardId);
    if (!board || board.isArchived) throw new NotFoundException('Board not found');
    const workspaceId = board.workspaceId;
    const member = await this.workspaces.getMember(workspaceId, userId);
    if (!member) throw new ForbiddenException('Not a workspace member');
    return { role: member.role, workspaceId };
  }

  /**
   * Verifies that a role has a required permission.
   * Throws if permission check fails.
   * 
   * @param role - The user's workspace role
   * @param permission - The required permission string (e.g., 'ticket.content.read')
   * @throws ForbiddenException if permission is not granted
   */
  require(role: WorkspaceRole, permission: string): void {
    const grants = ticketRolePermissions[role] ?? [];
    if (!hasPermission(grants, permission)) throw new ForbiddenException('Missing permission');
  }

  /**
   * Checks if a role has a required permission without throwing.
   * Useful for conditional logic (e.g., field filtering).
   * 
   * @param role - The user's workspace role
   * @param permission - The required permission string
   * @returns true if permission is granted, false otherwise
   */
  has(role: WorkspaceRole, permission: string): boolean {
    const grants = ticketRolePermissions[role] ?? [];
    return hasPermission(grants, permission);
  }
}


