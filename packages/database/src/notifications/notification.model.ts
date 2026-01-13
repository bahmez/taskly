export type NotificationType =
  | 'workspace_member_added'
  | 'workspace_member_role_updated'
  | 'workspace_member_removed'
  | 'workspace_invitation_accepted'
  | 'workspace_invitation_declined'
  | 'ticket_assigned'
  | 'ticket_unassigned'
  | 'ticket_comment_added'
  | 'ticket_mentioned'
  | 'ticket_attachment_uploaded'
  | 'ticket_reminder';

export type NotificationModel = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  /**
   * Arbitrary metadata for the frontend (deep links, ids, etc.)
   * Must be JSON-serializable.
   */
  data: Record<string, unknown>;
  /**
   * Actor responsible for this notification (optional).
   */
  actorId: string | null;
  createdAt: string;
  createdAtMs: number;
  readAt: string | null;
};

export type NotificationCreateInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  actorId?: string | null;
};


