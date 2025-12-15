import { Injectable } from '@nestjs/common';
import type {
  WorkspaceBoardModel,
  WorkspaceCreateInput,
  WorkspaceInvitationModel,
  WorkspaceMemberModel,
  WorkspaceModel,
  WorkspaceRole,
  WorkspaceUpdateInput,
} from './workspace.model';
import { WorkspacesStore } from './workspaces.store';

@Injectable()
export class WorkspacesService {
  constructor(private readonly store: WorkspacesStore) {}

  createWorkspace(input: WorkspaceCreateInput): Promise<WorkspaceModel> {
    return this.store.createWorkspace(input);
  }

  getWorkspaceById(workspaceId: string): Promise<WorkspaceModel | null> {
    return this.store.getWorkspaceById(workspaceId);
  }

  updateWorkspace(workspaceId: string, patch: WorkspaceUpdateInput): Promise<WorkspaceModel> {
    return this.store.updateWorkspace(workspaceId, patch);
  }

  archiveWorkspace(workspaceId: string): Promise<void> {
    return this.store.archiveWorkspace(workspaceId);
  }

  listWorkspacesForUser(userId: string): Promise<WorkspaceModel[]> {
    return this.store.listWorkspacesForUser(userId);
  }

  getMember(workspaceId: string, userId: string): Promise<WorkspaceMemberModel | null> {
    return this.store.getMember(workspaceId, userId);
  }

  upsertMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMemberModel> {
    return this.store.upsertMember(workspaceId, userId, role);
  }

  removeMember(workspaceId: string, userId: string): Promise<void> {
    return this.store.removeMember(workspaceId, userId);
  }

  listMembers(workspaceId: string): Promise<WorkspaceMemberModel[]> {
    return this.store.listMembers(workspaceId);
  }

  countMembers(workspaceId: string): Promise<number> {
    return this.store.countMembers(workspaceId);
  }

  countAdmins(workspaceId: string): Promise<number> {
    return this.store.countAdmins(workspaceId);
  }

  listBoards(workspaceId: string): Promise<WorkspaceBoardModel[]> {
    return this.store.listBoards(workspaceId);
  }

  createBoard(
    workspaceId: string,
    input: { title: string; backgroundColor?: string | null; memberIds?: string[] },
  ): Promise<WorkspaceBoardModel> {
    return this.store.createBoard(workspaceId, input);
  }

  archiveBoard(workspaceId: string, boardId: string): Promise<void> {
    return this.store.archiveBoard(workspaceId, boardId);
  }

  reorderBoards(workspaceId: string, boardIds: string[]): Promise<void> {
    return this.store.reorderBoards(workspaceId, boardIds);
  }

  createInvitation(
    workspaceId: string,
    input: { token: string; role: WorkspaceRole; createdBy: string; expiresAt: string },
  ): Promise<WorkspaceInvitationModel> {
    return this.store.createInvitation(workspaceId, input);
  }

  listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitationModel[]> {
    return this.store.listPendingInvitations(workspaceId);
  }

  findInvitationByToken(token: string): Promise<WorkspaceInvitationModel | null> {
    return this.store.findInvitationByToken(token);
  }

  acceptInvitationByToken(token: string, userId: string): Promise<WorkspaceInvitationModel> {
    return this.store.acceptInvitationByToken(token, userId);
  }

  declineInvitationByToken(token: string, userId: string): Promise<WorkspaceInvitationModel> {
    return this.store.declineInvitationByToken(token, userId);
  }

  cancelInvitation(workspaceId: string, invitationId: string, cancelledBy: string): Promise<void> {
    return this.store.cancelInvitation(workspaceId, invitationId, cancelledBy);
  }

  getInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationModel | null> {
    return this.store.getInvitation(workspaceId, invitationId);
  }
}


