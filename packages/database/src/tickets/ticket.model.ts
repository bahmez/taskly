export type TicketModel = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  dueDate: string | null;
  assigneeIds: string[];
  labelIds: string[];
  position: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketCreateInput = {
  columnId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  assigneeIds?: string[];
};

export type TicketUpdateInput = Partial<Pick<TicketModel, 'title' | 'description' | 'dueDate'>>;

export type TicketCommentModel = {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketChecklistItemModel = {
  id: string;
  ticketId: string;
  checklistId: string;
  content: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TicketChecklistModel = {
  id: string;
  ticketId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  items: TicketChecklistItemModel[];
};

export type TicketAttachmentStatus = 'pending' | 'uploaded';

export type TicketAttachmentModel = {
  id: string;
  ticketId: string;
  createdBy: string;
  filename: string;
  contentType: string;
  objectPath: string;
  status: TicketAttachmentStatus;
  size: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketWatchOverrideModel = {
  userId: string;
  watch: boolean;
  createdAt: string;
  updatedAt: string;
};


