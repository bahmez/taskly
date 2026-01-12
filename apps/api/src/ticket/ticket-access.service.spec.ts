import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardsService, TicketModel, TicketsService, WorkspacesService } from '@taskly/database';
import { TicketAccessService } from './ticket-access.service.js';

describe('TicketAccessService', () => {
  const tickets = { getById: vi.fn() } satisfies Pick<TicketsService, 'getById'>;
  const boards = { getBoardById: vi.fn() } satisfies Pick<BoardsService, 'getBoardById'>;
  const workspaces = { getMember: vi.fn() } satisfies Pick<WorkspacesService, 'getMember'>;

  let service: TicketAccessService;

  beforeEach(() => {
    tickets.getById.mockReset();
    boards.getBoardById.mockReset();
    workspaces.getMember.mockReset();
    service = new TicketAccessService(
      tickets as unknown as TicketsService,
      boards as unknown as BoardsService,
      workspaces as unknown as WorkspacesService,
    );
  });

  it('getTicketOrThrow throws when ticket does not exist', async () => {
    tickets.getById.mockResolvedValueOnce(null);
    await expect(service.getTicketOrThrow('t1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getWorkspaceRoleForTicketOrThrow throws when board does not exist', async () => {
    const ticket = { boardId: 'b1' } as unknown as TicketModel;
    boards.getBoardById.mockResolvedValueOnce(null);
    await expect(service.getWorkspaceRoleForTicketOrThrow('u1', ticket)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getWorkspaceRoleForTicketOrThrow throws when board is archived', async () => {
    const ticket = { boardId: 'b1' } as unknown as TicketModel;
    boards.getBoardById.mockResolvedValueOnce({ id: 'b1', isArchived: true });
    await expect(service.getWorkspaceRoleForTicketOrThrow('u1', ticket)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getWorkspaceRoleForTicketOrThrow throws when user is not a member', async () => {
    const ticket = { boardId: 'b1' } as unknown as TicketModel;
    boards.getBoardById.mockResolvedValueOnce({ id: 'b1', isArchived: false, workspaceId: 'w1' });
    workspaces.getMember.mockResolvedValueOnce(null);
    await expect(service.getWorkspaceRoleForTicketOrThrow('u1', ticket)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getWorkspaceRoleForTicketOrThrow returns role + workspaceId when permitted', async () => {
    const ticket = { boardId: 'b1' } as unknown as TicketModel;
    boards.getBoardById.mockResolvedValueOnce({ id: 'b1', isArchived: false, workspaceId: 'w1' });
    workspaces.getMember.mockResolvedValueOnce({ role: 'editor' });
    await expect(service.getWorkspaceRoleForTicketOrThrow('u1', ticket)).resolves.toEqual({
      role: 'editor',
      workspaceId: 'w1',
    });
  });

  it('require throws when role lacks permission', () => {
    expect(() => service.require('viewer', 'ticket.content.write')).toThrow(ForbiddenException);
  });

  it('require does not throw when role has permission', () => {
    expect(() => service.require('editor', 'ticket.content.write')).not.toThrow();
  });
});


