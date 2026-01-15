export type BoardBackgroundImage = {
  source: 'unsplash';
  id: string;
  url: string;
  thumbUrl: string;
  blurHash?: string | null;
  color?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
};

export type BoardBackground =
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; value: BoardBackgroundImage };

export type BoardModel = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  background: BoardBackground | null;
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
  background?: BoardBackground | null;
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

export type BoardLabelModel = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardLabelCreateInput = {
  name: string;
  color?: string | null;
};

export type BoardLabelUpdateInput = Partial<Pick<BoardLabelModel, 'name' | 'color'>>;


