export type ActivityLogType =
  | 'board_created'
  | 'board_updated'
  | 'board_archived'
  | 'board_column_created'
  | 'board_column_updated'
  | 'board_column_deleted'
  | 'board_columns_reordered'
  | 'board_label_created'
  | 'board_label_updated'
  | 'board_label_deleted'
  | 'board_labels_reordered'
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_moved'
  | 'ticket_archived'
  | 'ticket_comment_added'
  | 'ticket_comment_updated'
  | 'ticket_comment_deleted'
  | 'ticket_assignee_added'
  | 'ticket_assignee_removed'
  | 'ticket_label_added'
  | 'ticket_label_removed'
  | 'ticket_checklist_created'
  | 'ticket_checklist_updated'
  | 'ticket_checklist_deleted'
  | 'ticket_checklist_item_added'
  | 'ticket_checklist_item_updated'
  | 'ticket_checklist_item_deleted'
  | 'ticket_attachment_upload_created'
  | 'ticket_attachment_uploaded'
  | 'ticket_attachment_removed';

export type ActivityLogModel = {
  id: string;
  boardId: string;
  ticketId: string | null;
  type: ActivityLogType;
  actorId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdAtMs: number;
};

export type ActivityLogCreateInput = {
  ticketId?: string | null;
  type: ActivityLogType;
  actorId?: string | null;
  data?: Record<string, unknown>;
};

