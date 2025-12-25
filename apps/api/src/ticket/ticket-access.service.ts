import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { TicketModel, WorkspaceRole } from '@taskly/database';
import { BoardsService, TicketsService, WorkspacesService } from '@taskly/database';
import { hasPermission, ticketRolePermissions } from '@taskly/shared';

@Injectable()
export class TicketAccessService {
  constructor(
    private readonly tickets: TicketsService,
    private readonly boards: BoardsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async getTicketOrThrow(ticketId: string): Promise<TicketModel> {
    const t = await this.tickets.getById(ticketId);
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

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

  require(role: WorkspaceRole, permission: string): void {
    const grants = ticketRolePermissions[role] ?? [];
    if (!hasPermission(grants, permission)) throw new ForbiddenException('Missing permission');
  }

  has(role: WorkspaceRole, permission: string): boolean {
    const grants = ticketRolePermissions[role] ?? [];
    return hasPermission(grants, permission);
  }
}


