import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  WorkspaceMemberModel,
  WorkspaceModel,
  WorkspacesService,
} from '@taskly/database';
import { WorkspaceAccessService } from './workspace-access.service.js';

describe('WorkspaceAccessService', () => {
  const workspaces = {
    getWorkspaceById: vi.fn(),
    getMember: vi.fn(),
  } satisfies Pick<WorkspacesService, 'getWorkspaceById' | 'getMember'>;

  let service: WorkspaceAccessService;

  beforeEach(() => {
    workspaces.getWorkspaceById.mockReset();
    workspaces.getMember.mockReset();
    service = new WorkspaceAccessService(workspaces as unknown as WorkspacesService);
  });

  it('getWorkspaceOrThrow throws when workspace does not exist', async () => {
    workspaces.getWorkspaceById.mockResolvedValueOnce(null);
    await expect(service.getWorkspaceOrThrow('w1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getWorkspaceOrThrow throws when workspace is archived', async () => {
    workspaces.getWorkspaceById.mockResolvedValueOnce({ id: 'w1', isArchived: true } as unknown as WorkspaceModel);
    await expect(service.getWorkspaceOrThrow('w1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getMemberOrThrow throws when user is not a member', async () => {
    workspaces.getMember.mockResolvedValueOnce(null);
    await expect(service.getMemberOrThrow('w1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requirePermission throws when role lacks permission', async () => {
    workspaces.getWorkspaceById.mockResolvedValueOnce({ id: 'w1', isArchived: false } as unknown as WorkspaceModel);
    workspaces.getMember.mockResolvedValueOnce({ role: 'viewer' } as unknown as WorkspaceMemberModel);

    await expect(service.requirePermission('w1', 'u1', 'workspace.members.write')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requirePermission returns workspace/member/role when permitted', async () => {
    const workspace = { id: 'w1', isArchived: false } as unknown as WorkspaceModel;
    const member = { role: 'maintainer' } as unknown as WorkspaceMemberModel;
    workspaces.getWorkspaceById.mockResolvedValueOnce(workspace);
    workspaces.getMember.mockResolvedValueOnce(member);

    await expect(service.requirePermission('w1', 'u1', 'workspace.members.write')).resolves.toEqual({
      workspace,
      member,
      role: 'maintainer',
    });
  });

  it('assertNonEmptyId throws BadRequestException for empty id', () => {
    expect(() => service.assertNonEmptyId('   ', 'workspaceId')).toThrow(BadRequestException);
  });
});


