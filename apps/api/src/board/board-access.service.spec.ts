import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardsService, WorkspacesService } from '@taskly/database';
import { BoardAccessService } from './board-access.service.js';

describe('BoardAccessService', () => {
  const boards = { getBoardById: vi.fn() } satisfies Pick<BoardsService, 'getBoardById'>;
  const workspaces = { getMember: vi.fn() } satisfies Pick<WorkspacesService, 'getMember'>;
  let service: BoardAccessService;

  beforeEach(() => {
    boards.getBoardById.mockReset();
    workspaces.getMember.mockReset();
    service = new BoardAccessService(
      boards as unknown as BoardsService,
      workspaces as unknown as WorkspacesService,
    );
  });

  it('getBoardOrThrow throws when board does not exist', async () => {
    boards.getBoardById.mockResolvedValueOnce(null);
    await expect(service.getBoardOrThrow('b1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getBoardOrThrow throws when board is archived', async () => {
    boards.getBoardById.mockResolvedValueOnce({ id: 'b1', isArchived: true });
    await expect(service.getBoardOrThrow('b1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getWorkspaceRoleOrThrow throws when user is not a member', async () => {
    workspaces.getMember.mockResolvedValueOnce(null);
    await expect(service.getWorkspaceRoleOrThrow('u1', 'w1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('getWorkspaceRoleOrThrow returns the role when membership exists', async () => {
    workspaces.getMember.mockResolvedValueOnce({ role: 'editor' });
    await expect(service.getWorkspaceRoleOrThrow('u1', 'w1')).resolves.toBe('editor');
  });

  it('requirePermission throws when role lacks permission', () => {
    expect(() => service.requirePermission('viewer' as unknown as never, 'board.tickets.write')).toThrow(
      ForbiddenException,
    );
  });

  it('requirePermission does not throw when role has permission', () => {
    expect(() => service.requirePermission('editor' as unknown as never, 'board.tickets.write')).not.toThrow();
  });

  it('assertNonEmptyId throws BadRequestException for empty id', () => {
    expect(() => service.assertNonEmptyId('   ', 'boardId')).toThrow(BadRequestException);
  });
});


