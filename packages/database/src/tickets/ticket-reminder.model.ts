export type TicketReminderModel = {
  id: string;
  boardId: string;
  ticketId: string;
  userId: string;
  remindAt: string;
  remindAtMs: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  /**
   * One notification per user target (assignees, creator, etc.).
   */
  notificationIds: Record<string, string>;
};

export type TicketReminderCreateInput = {
  userId: string;
  remindAt: string;
};

