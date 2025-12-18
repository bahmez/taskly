export type BoardModel = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  background: string | null;
  order: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardCreateInput = {
  workspaceId: string;
  title: string;
  description?: string;
  background?: string | null;
};

export type BoardUpdateInput = Partial<Pick<BoardModel, 'title' | 'description' | 'background'>>;

export type BoardColumnModel = {
  id: string;
  boardId: string;
  title: string;
  key: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardColumnCreateInput = {
  title: string;
  key: string;
};

export type BoardColumnUpdateInput = Partial<Pick<BoardColumnModel, 'title' | 'key'>>;


