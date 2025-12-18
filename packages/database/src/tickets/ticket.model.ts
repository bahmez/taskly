export type TicketModel = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  position: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketUpdateInput = Partial<Pick<TicketModel, 'title' | 'description'>>;


