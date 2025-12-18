export type WorkspaceRole = 'admin' | 'maintainer' | 'editor' | 'viewer';

export type WorkspaceModel = {
  id: string;
  title: string;
  description: string;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceCreateInput = {
  title: string;
  description?: string;
};

export type WorkspaceUpdateInput = Partial<
  Pick<WorkspaceModel, 'title' | 'description' | 'isArchived' | 'archivedAt'>
>;

export type WorkspaceMemberModel = {
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceInvitationModel = {
  id: string;
  workspaceId: string;
  token: string;
  role: WorkspaceRole;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  declinedAt: string | null;
  declinedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
};


