export type TicketModel = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  dueDate: string | null;
  assigneeIds: string[];
  position: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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


