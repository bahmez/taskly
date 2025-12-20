export type Id = string;

export type UserProfile = {
  id: Id;
  email: string;
  displayName?: string;
  photoURL?: string;
};

export type WorkspaceRole = 'admin' | 'maintainer' | 'editor' | 'viewer';

export type Workspace = {
  id: Id;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  userId: Id;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  id: Id;
  title: string;
  backgroundColor?: string;
  memberIds: Id[];
  createdAt: string;
  updatedAt: string;
};

export type List = {
  id: Id;
  boardId: Id;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Card = {
  id: Id;
  listId: Id;
  title: string;
  description?: string;
  isDone: boolean;
  dueDate?: string;
  labelIds?: Id[];
  memberIds?: Id[];
  createdAt: string;
  updatedAt: string;
};

export * from './workspace-permissions';
export * from './board-ticket-permissions';
export * from './ticket-permissions';


