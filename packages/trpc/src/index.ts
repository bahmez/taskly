import superjson from 'superjson';
import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { WorkspaceRole } from '@taskly/shared';
import {
  boardRolePermissions,
  canAssignRole,
  hasPermission,
  ticketRolePermissions,
  workspaceRolePermissions,
} from '@taskly/shared';

function extractMentionUserIdsFromLegacyMarkdown(text: string): string[] {
  // Legacy mentions stored as markdown links: @[Label](user:<userId>)
  const ids: string[] = [];
  const re = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = (m[2] ?? '').trim();
    if (id) ids.push(id);
  }
  return Array.from(new Set(ids));
}

function extractMentionUsernames(text: string): string[] {
  // Mentions stored as @username (avoid emails/mid-word by requiring start/whitespace before @)
  const names: string[] = [];
  const re = /(^|\s)@([a-zA-Z0-9._-]{1,50})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const username = (m[2] ?? '').trim();
    if (username) names.push(username);
  }
  return Array.from(new Set(names));
}

const boardBackgroundImageSchema = z.object({
  source: z.literal('unsplash').optional(),
  id: z.string().min(1),
  url: z.string().url(),
  thumbUrl: z.string().url(),
  blurHash: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  authorUrl: z.string().url().optional().nullable(),
});

const boardBackgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), value: z.string().min(1) }),
  z.object({ type: z.literal('gradient'), value: z.string().min(1) }),
  z.object({ type: z.literal('image'), value: boardBackgroundImageSchema }),
]);

type BoardBackgroundInput = z.infer<typeof boardBackgroundSchema>;

function normalizeBoardBackground(input: BoardBackgroundInput): BoardBackground {
  if (input.type !== 'image') return input;
  return {
    type: 'image',
    value: {
      ...input.value,
      source: 'unsplash',
    },
  };
}

async function resolveMentionUserIds(ctx: Context, workspaceId: string, text: string): Promise<string[]> {
  const legacyIds = extractMentionUserIdsFromLegacyMarkdown(text);
  const usernames = extractMentionUsernames(text);
  if (legacyIds.length === 0 && usernames.length === 0) return [];

  const members = await ctx.workspaces.listMembers(workspaceId);
  const memberIds = members.map((m) => m.userId);
  const allowedIds = new Set(memberIds);

  // Resolve usernames to ids within the workspace.
  const users = await Promise.all(memberIds.map((id) => ctx.users.getById(id)));
  const usernameToId = new Map((users.filter(Boolean) as User[]).map((u) => [u.username, u.id]));

  const resolvedFromNames: string[] = [];
  for (const u of usernames) {
    const id = usernameToId.get(u);
    if (id) resolvedFromNames.push(id);
  }

  const all = Array.from(new Set([...legacyIds, ...resolvedFromNames]));
  // Filter out anything outside workspace membership just in case.
  return all.filter((id) => allowedIds.has(id));
}

async function diffMentionUserIds(ctx: Context, workspaceId: string, beforeText: string, afterText: string): Promise<string[]> {
  const [beforeIds, afterIds] = await Promise.all([
    resolveMentionUserIds(ctx, workspaceId, beforeText),
    resolveMentionUserIds(ctx, workspaceId, afterText),
  ]);
  const before = new Set(beforeIds);
  const added: string[] = [];
  for (const id of afterIds) {
    if (!before.has(id)) added.push(id);
  }
  return added;
}

async function requireMentionUsersInWorkspace(ctx: Context, workspaceId: string, text: string): Promise<void> {
  const legacyIds = extractMentionUserIdsFromLegacyMarkdown(text);
  const usernames = extractMentionUsernames(text);
  if (legacyIds.length === 0 && usernames.length === 0) return;

  const members = await ctx.workspaces.listMembers(workspaceId);
  const allowedIds = new Set(members.map((m) => m.userId));

  const invalidLegacy = legacyIds.filter((id) => !allowedIds.has(id));
  if (invalidLegacy.length > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid mention(s)' });

  if (usernames.length > 0) {
    const users = await Promise.all(members.map((m) => ctx.users.getById(m.userId)));
    const allowedUsernames = new Set((users.filter(Boolean) as User[]).map((u) => u.username));
    const invalidNames = usernames.filter((u) => !allowedUsernames.has(u));
    if (invalidNames.length > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid mention(s)' });
  }
}

export type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type UserUpdateInput = Partial<
  Pick<User, 'username' | 'first_name' | 'last_name' | 'description'>
>;

export type UsersContext = {
  getById: (id: string) => Promise<User | null>;
  search: (q: string, limit: number) => Promise<User[]>;
  updateMe: (userId: string, patch: UserUpdateInput) => Promise<User>;
  deleteMe: (userId: string) => Promise<void>;
};

export type Workspace = {
  id: string;
  title: string;
  description: string;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
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

export type BoardColumn = {
  id: string;
  boardId: string;
  title: string;
  key: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardLabel = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TicketPermissions = {
  role: WorkspaceRole;
  canContentWrite: boolean;
  canCommentsRead: boolean;
  canCommentsWrite: boolean;
  canAssignmentsRead: boolean;
  canAssignmentsWrite: boolean;
};

export type Ticket = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  dueDate: string | null;
  assigneeIds?: string[];
  labelIds: string[];
  position: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: TicketPermissions;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketChecklistItem = {
  id: string;
  ticketId: string;
  checklistId: string;
  content: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TicketChecklist = {
  id: string;
  ticketId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  items: TicketChecklistItem[];
};

export type TicketAttachmentStatus = 'pending' | 'uploaded';

export type TicketAttachment = {
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

export type TicketReminder = {
  id: string;
  boardId: string;
  ticketId: string;
  userId: string;
  remindAt: string;
  remindAtMs: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  notificationIds: Record<string, string>;
};

export type SignedUrl = {
  url: string;
  method: 'PUT' | 'GET' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
  type: 'write' | 'resumable' | 'read';
};

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

export type ActivityLog = {
  id: string;
  boardId: string;
  ticketId: string | null;
  type: ActivityLogType;
  actorId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  createdAtMs: number;
};

export type ActivityLogsContext = {
  create: (
    boardId: string,
    input: { ticketId?: string | null; type: ActivityLogType; actorId?: string | null; data?: Record<string, unknown> },
  ) => Promise<ActivityLog>;
  listForBoard: (
    boardId: string,
    input: { limit: number; cursor?: string | null; includeTickets?: boolean },
  ) => Promise<{ items: ActivityLog[]; nextCursor: string | null }>;
  listForTicket: (
    boardId: string,
    ticketId: string,
    input: { limit: number; cursor?: string | null },
  ) => Promise<{ items: ActivityLog[]; nextCursor: string | null }>;
};

export type WorkspaceInvitation = {
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

export type WorkspacesContext = {
  createWorkspace: (input: { title: string; description?: string }) => Promise<Workspace>;
  getWorkspaceById: (workspaceId: string) => Promise<Workspace | null>;
  updateWorkspace: (
    workspaceId: string,
    patch: { title?: string; description?: string },
  ) => Promise<Workspace>;
  archiveWorkspace: (workspaceId: string) => Promise<void>;
  unarchiveWorkspace: (workspaceId: string) => Promise<void>;
  listWorkspacesForUser: (userId: string) => Promise<Workspace[]>;
  listArchivedWorkspacesForUser: (userId: string) => Promise<Workspace[]>;

  getMember: (workspaceId: string, userId: string) => Promise<WorkspaceMember | null>;
  upsertMember: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<WorkspaceMember>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  listMembers: (workspaceId: string) => Promise<WorkspaceMember[]>;
  countMembers: (workspaceId: string) => Promise<number>;
  countAdmins: (workspaceId: string) => Promise<number>;

  createInvitation: (
    workspaceId: string,
    input: { token: string; role: WorkspaceRole; createdBy: string; expiresAt: string },
  ) => Promise<WorkspaceInvitation>;
  listPendingInvitations: (workspaceId: string) => Promise<WorkspaceInvitation[]>;
  getInvitation: (workspaceId: string, invitationId: string) => Promise<WorkspaceInvitation | null>;
  cancelInvitation: (workspaceId: string, invitationId: string, cancelledBy: string) => Promise<void>;
  acceptInvitationByToken: (token: string, userId: string) => Promise<WorkspaceInvitation>;
  declineInvitationByToken: (token: string, userId: string) => Promise<WorkspaceInvitation>;
};

export type BoardsContext = {
  getBoardById: (boardId: string) => Promise<Board | null>;
  updateBoard: (boardId: string, patch: { title?: string; description?: string; background?: BoardBackground | null }) => Promise<Board>;
  archiveBoard: (boardId: string) => Promise<void>;

  listBoardsForWorkspace: (workspaceId: string) => Promise<Board[]>;
  createBoard: (input: { workspaceId: string; title: string; description?: string; background?: BoardBackground | null }) => Promise<Board>;
  reorderBoards: (workspaceId: string, boardIds: string[]) => Promise<void>;

  listColumns: (boardId: string) => Promise<BoardColumn[]>;
  createColumn: (boardId: string, input: { title: string; key: string }) => Promise<BoardColumn>;
  updateColumn: (boardId: string, columnId: string, patch: { title?: string; key?: string }) => Promise<BoardColumn>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;

  listLabels: (boardId: string) => Promise<BoardLabel[]>;
  createLabel: (boardId: string, input: { name: string; color?: string | null }) => Promise<BoardLabel>;
  updateLabel: (boardId: string, labelId: string, patch: { name?: string; color?: string }) => Promise<BoardLabel>;
  deleteLabel: (boardId: string, labelId: string) => Promise<void>;
  reorderLabels: (boardId: string, labelIds: string[]) => Promise<void>;

  listTickets: (boardId: string) => Promise<Ticket[]>;
  listTicketsByColumn: (boardId: string, columnId: string) => Promise<Ticket[]>;
  createTicket: (
    boardId: string,
    input: { columnId: string; title: string; description?: string; dueDate?: string | null; assigneeIds?: string[] },
  ) => Promise<Ticket>;
  moveTicket: (boardId: string, ticketId: string, input: { columnId: string; position: number }) => Promise<void>;
  archiveTicket: (boardId: string, ticketId: string) => Promise<void>;
};

export type BoardBackgroundsContext = {
  list: (input: {
    type: 'color' | 'gradient' | 'image';
    limit: number;
    cursor?: string | null;
    query?: string | null;
  }) => Promise<{ items: BoardBackground[]; nextCursor: string | null }>;
};

export type TicketsContext = {
  getById: (ticketId: string) => Promise<Ticket | null>;
  update: (ticketId: string, patch: { title?: string; description?: string; dueDate?: string | null }) => Promise<Ticket>;
  archive: (ticketId: string) => Promise<void>;

  listComments: (ticketId: string) => Promise<TicketComment[]>;
  addComment: (ticketId: string, input: { authorId: string; content: string }) => Promise<TicketComment>;
  updateComment: (ticketId: string, commentId: string, patch: { content: string }) => Promise<TicketComment>;
  deleteComment: (ticketId: string, commentId: string) => Promise<void>;

  getAssigneeIds: (ticketId: string) => Promise<string[]>;
  addAssignee: (ticketId: string, userId: string) => Promise<void>;
  removeAssignee: (ticketId: string, userId: string) => Promise<void>;
  getWatchStatus: (ticketId: string, userId: string) => Promise<{ isWatching: boolean; isExplicit: boolean }>;
  setWatchStatus: (ticketId: string, userId: string, watch: boolean) => Promise<void>;
  listWatchUserIds: (ticketId: string) => Promise<string[]>;

  getLabelIds: (ticketId: string) => Promise<string[]>;
  addLabel: (ticketId: string, labelId: string) => Promise<void>;
  removeLabel: (ticketId: string, labelId: string) => Promise<void>;

  listChecklists: (ticketId: string) => Promise<TicketChecklist[]>;
  createChecklist: (ticketId: string, input: { title: string }) => Promise<TicketChecklist>;
  updateChecklist: (ticketId: string, checklistId: string, patch: { title?: string }) => Promise<TicketChecklist>;
  deleteChecklist: (ticketId: string, checklistId: string) => Promise<void>;
  reorderChecklists: (ticketId: string, checklistIds: string[]) => Promise<void>;

  addChecklistItem: (ticketId: string, checklistId: string, input: { content: string }) => Promise<TicketChecklistItem>;
  updateChecklistItem: (
    ticketId: string,
    checklistId: string,
    itemId: string,
    patch: { content?: string; isDone?: boolean },
  ) => Promise<TicketChecklistItem>;
  deleteChecklistItem: (ticketId: string, checklistId: string, itemId: string) => Promise<void>;
  reorderChecklistItems: (ticketId: string, checklistId: string, itemIds: string[]) => Promise<void>;

  listAttachments: (ticketId: string) => Promise<TicketAttachment[]>;
  createAttachmentUpload: (
    ticketId: string,
    input: { filename: string; contentType: string; resumable?: boolean },
  ) => Promise<{ attachment: TicketAttachment; upload: SignedUrl }>;
  completeAttachment: (ticketId: string, attachmentId: string, patch: { size?: number }) => Promise<TicketAttachment>;
  getAttachmentDownload: (ticketId: string, attachmentId: string) => Promise<{ attachment: TicketAttachment; download: SignedUrl }>;
  removeAttachment: (ticketId: string, attachmentId: string) => Promise<void>;
};

export type TicketRemindersContext = {
  list: (ticketId: string, input: { userId: string }) => Promise<TicketReminder[]>;
  create: (ticketId: string, input: { userId: string; remindAt: string }) => Promise<TicketReminder>;
  remove: (ticketId: string, reminderId: string, input: { userId: string }) => Promise<void>;
};

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

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  actorId: string | null;
  createdAt: string;
  createdAtMs: number;
  readAt: string | null;
};

export type NotificationsContext = {
  create: (
    userId: string,
    input: { type: NotificationType; title: string; body?: string | null; data?: Record<string, unknown>; actorId?: string | null },
  ) => Promise<Notification>;
  list: (
    userId: string,
    input: { limit: number; cursor?: string | null; unreadOnly?: boolean },
  ) => Promise<{ items: Notification[]; nextCursor: string | null }>;
  countUnread: (userId: string) => Promise<number>;
  markRead: (userId: string, notificationId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
};

export type Context = {
  user: User | null;
  users: UsersContext;
  workspaces: WorkspacesContext;
  boards: BoardsContext;
  boardBackgrounds: BoardBackgroundsContext;
  tickets: TicketsContext;
  ticketReminders: TicketRemindersContext;
  notifications: NotificationsContext;
  activityLogs: ActivityLogsContext;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});

async function safeNotify(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch {
    // Best-effort: never fail the main action because of a notification write.
  }
}

async function safeLog(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch {
    // Best-effort: never fail the main action because of an activity-log write.
  }
}

function asRole(x: unknown): WorkspaceRole | null {
  if (x === 'admin' || x === 'maintainer' || x === 'editor' || x === 'viewer') return x;
  return null;
}

function randomToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function requireWorkspacePermission(
  ctx: Context,
  workspaceId: string,
  required: string,
): Promise<{ workspace: Workspace; member: WorkspaceMember; role: WorkspaceRole }> {
  const ws = await ctx.workspaces.getWorkspaceById(workspaceId);
  if (!ws || ws.isArchived) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
  }

  const member = await ctx.workspaces.getMember(workspaceId, ctx.user!.id);
  if (!member) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });
  }

  const role = member.role;
  const grants = workspaceRolePermissions[role] ?? [];
  if (!hasPermission(grants, required)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
  }

  return { workspace: ws, member, role };
}

async function requireWorkspacePermissionAllowArchived(
  ctx: Context,
  workspaceId: string,
  required: string,
): Promise<{ workspace: Workspace; member: WorkspaceMember; role: WorkspaceRole }> {
  const ws = await ctx.workspaces.getWorkspaceById(workspaceId);
  if (!ws) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
  }

  const member = await ctx.workspaces.getMember(workspaceId, ctx.user!.id);
  if (!member) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });
  }

  const role = member.role;
  const grants = workspaceRolePermissions[role] ?? [];
  if (!hasPermission(grants, required)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
  }

  return { workspace: ws, member, role };
}

async function requireTicketPermission(
  ctx: Context,
  ticketId: string,
  required: string,
): Promise<{ ticket: Ticket; role: WorkspaceRole; workspaceId: string }> {
  const ticket = await ctx.tickets.getById(ticketId);
  if (!ticket) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });

  const board = await ctx.boards.getBoardById(ticket.boardId);
  if (!board || board.isArchived) throw new TRPCError({ code: 'NOT_FOUND', message: 'Board not found' });
  const workspaceId = board.workspaceId;

  const member = await ctx.workspaces.getMember(workspaceId, ctx.user!.id);
  if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });

  const role = member.role;
  const grants = ticketRolePermissions[role] ?? [];
  if (!hasPermission(grants, required)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
  }
  return { ticket, role, workspaceId };
}

async function requireBoardPermission(
  ctx: Context,
  boardId: string,
  required: string,
): Promise<{ board: Board; role: WorkspaceRole; workspaceId: string; grants: string[] }> {
  const board = await ctx.boards.getBoardById(boardId);
  if (!board || board.isArchived) throw new TRPCError({ code: 'NOT_FOUND', message: 'Board not found' });

  const workspaceId = board.workspaceId;
  const member = await ctx.workspaces.getMember(workspaceId, ctx.user!.id);
  if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });

  const role = member.role;
  const grants = (boardRolePermissions[role] ?? []) as string[];
  if (!hasPermission(grants, required)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
  }
  return { board, role, workspaceId, grants };
}

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string().optional() }).optional())
    .query(({ input }) => {
      const text = input?.text ?? 'monorepo';
      return { message: `Bonjour ${text} — tRPC OK` };
    }),
  notifications: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(50).default(20),
          cursor: z.string().min(1).nullable().optional(),
          unreadOnly: z.boolean().optional(),
        }),
      )
      .query(({ ctx, input }) =>
        ctx.notifications.list(ctx.user!.id, {
          limit: input.limit,
          cursor: input.cursor ?? null,
          unreadOnly: input.unreadOnly ?? false,
        }),
      ),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await ctx.notifications.countUnread(ctx.user!.id);
      return { count };
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.notifications.markRead(ctx.user!.id, input.id);
        return { ok: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await ctx.notifications.markAllRead(ctx.user!.id);
      return { ok: true };
    }),
  }),
  users: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),

    byId: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const user = await ctx.users.getById(input.id);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        return user;
      }),

    byIds: protectedProcedure
      .input(z.object({ ids: z.array(z.string().min(1)).max(200) }))
      .query(async ({ ctx, input }) => {
        const ids = Array.from(new Set(input.ids));
        const users = await Promise.all(ids.map((id) => ctx.users.getById(id)));
        return users.filter(Boolean) as User[];
      }),

    search: protectedProcedure
      .input(
        z.object({
          q: z.string().default(''),
          limit: z.number().int().min(1).max(30).default(10),
        }),
      )
      .query(({ ctx, input }) => ctx.users.search(input.q, input.limit)),

    updateMe: protectedProcedure
      .input(
        z.object({
          username: z.string().min(1).max(64).optional(),
          first_name: z.string().max(128).optional(),
          last_name: z.string().max(128).optional(),
          description: z.string().max(2048).optional(),
        }),
      )
      .mutation(({ ctx, input }) => ctx.users.updateMe(ctx.user!.id, input)),

    deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
      await ctx.users.deleteMe(ctx.user!.id);
      return { ok: true };
    }),
  }),
  workspaces: router({
    list: protectedProcedure
      .input(z.object({ archived: z.boolean().optional() }).optional())
      .query(({ ctx, input }) => {
        const archived = Boolean(input?.archived);
        return archived
          ? ctx.workspaces.listArchivedWorkspacesForUser(ctx.user!.id)
          : ctx.workspaces.listWorkspacesForUser(ctx.user!.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(200),
          description: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const ws = await ctx.workspaces.createWorkspace({
          title: input.title.trim(),
          description: input.description?.trim(),
        });
        await ctx.workspaces.upsertMember(ws.id, ctx.user!.id, 'admin');
        return ws;
      }),

    byId: protectedProcedure
      .input(z.object({ workspaceId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.meta.read');
        const ws = await ctx.workspaces.getWorkspaceById(input.workspaceId);
        if (!ws || ws.isArchived) throw new TRPCError({ code: 'NOT_FOUND' });

        const [membersCount, boards] = await Promise.all([
          ctx.workspaces.countMembers(input.workspaceId),
          ctx.boards.listBoardsForWorkspace(input.workspaceId),
        ]);

        return { ...ws, stats: { membersCount, boardsCount: boards.length } };
      }),

    update: protectedProcedure
      .input(
        z.object({
          workspaceId: z.string().min(1),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.meta.write');
        const patch: { title?: string; description?: string } = {};
        if (typeof input.title === 'string') patch.title = input.title.trim();
        if (typeof input.description === 'string') patch.description = input.description.trim();
        return await ctx.workspaces.updateWorkspace(input.workspaceId, patch);
      }),

    remove: protectedProcedure
      .input(z.object({ workspaceId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.meta.write');
        await ctx.workspaces.archiveWorkspace(input.workspaceId);
        return { ok: true };
      }),

    unarchive: protectedProcedure
      .input(z.object({ workspaceId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireWorkspacePermissionAllowArchived(ctx, input.workspaceId, 'workspace.meta.write');
        await ctx.workspaces.unarchiveWorkspace(input.workspaceId);
        return { ok: true };
      }),

    members: router({
      list: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.members.read');
          return await ctx.workspaces.listMembers(input.workspaceId);
        }),

      add: protectedProcedure
        .input(
          z.object({
            workspaceId: z.string().min(1),
            userId: z.string().min(1),
            role: z.enum(['admin', 'maintainer', 'editor', 'viewer']),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { role: actorRole, workspace } = await requireWorkspacePermission(
            ctx,
            input.workspaceId,
            'workspace.members.write',
          );
          const role = asRole(input.role)!;
          if (!canAssignRole(actorRole, role)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot assign this role' });
          }
          const exists = await ctx.users.getById(input.userId);
          if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
          const member = await ctx.workspaces.upsertMember(input.workspaceId, input.userId, role);
          if (input.userId !== ctx.user!.id) {
            await safeNotify(
              ctx.notifications.create(input.userId, {
                type: 'workspace_member_added',
                title: `Vous avez été ajouté au workspace "${workspace.title}"`,
                body: `Rôle: ${role}`,
                actorId: ctx.user!.id,
                data: { workspaceId: workspace.id, role },
              }),
            );
          }
          return member;
        }),

      updateRole: protectedProcedure
        .input(
          z.object({
            workspaceId: z.string().min(1),
            userId: z.string().min(1),
            role: z.enum(['admin', 'maintainer', 'editor', 'viewer']),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { role: actorRole, workspace } = await requireWorkspacePermission(
            ctx,
            input.workspaceId,
            'workspace.members.write',
          );
          const role = asRole(input.role)!;
          if (!canAssignRole(actorRole, role)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot assign this role' });
          }

          const before = await ctx.workspaces.getMember(input.workspaceId, input.userId);
          if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });

          if (before.role === 'admin' && role !== 'admin') {
            const admins = await ctx.workspaces.countAdmins(input.workspaceId);
            if (admins <= 1) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the last admin' });
            }
          }

          const updated = await ctx.workspaces.upsertMember(input.workspaceId, input.userId, role);
          if (input.userId !== ctx.user!.id) {
            await safeNotify(
              ctx.notifications.create(input.userId, {
                type: 'workspace_member_role_updated',
                title: `Votre rôle a été modifié dans "${workspace.title}"`,
                body: `Nouveau rôle: ${role}`,
                actorId: ctx.user!.id,
                data: { workspaceId: workspace.id, role },
              }),
            );
          }
          return updated;
        }),

      remove: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1), userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { workspace } = await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.members.write');
          const before = await ctx.workspaces.getMember(input.workspaceId, input.userId);
          if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
          if (before.role === 'admin') {
            const admins = await ctx.workspaces.countAdmins(input.workspaceId);
            if (admins <= 1) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the last admin' });
            }
          }
          await ctx.workspaces.removeMember(input.workspaceId, input.userId);
          if (input.userId !== ctx.user!.id) {
            await safeNotify(
              ctx.notifications.create(input.userId, {
                type: 'workspace_member_removed',
                title: `Vous avez été retiré du workspace "${workspace.title}"`,
                body: null,
                actorId: ctx.user!.id,
                data: { workspaceId: workspace.id },
              }),
            );
          }
          return { ok: true };
        }),
    }),

    boards: router({
      list: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.boards.read');
          return await ctx.boards.listBoardsForWorkspace(input.workspaceId);
        }),

      create: protectedProcedure
        .input(
          z.object({
            workspaceId: z.string().min(1),
            title: z.string().min(1).max(200),
            backgroundColor: z.string().nullable().optional(),
            background: boardBackgroundSchema.nullable().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.boards.write');
          const legacyColor = (input.backgroundColor ?? '').trim();
          const background: BoardBackground | null = input.background
            ? normalizeBoardBackground(input.background)
            : legacyColor
              ? ({ type: 'color', value: legacyColor } satisfies BoardBackground)
              : null;
          return await ctx.boards.createBoard({
            workspaceId: input.workspaceId,
            title: input.title.trim(),
            background,
          });
        }),

      reorder: protectedProcedure
        .input(
          z.object({
            workspaceId: z.string().min(1),
            boardIds: z.array(z.string().min(1)).min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.boards.write');
          if (new Set(input.boardIds).size !== input.boardIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'boardIds must be unique' });
          }
          await ctx.boards.reorderBoards(input.workspaceId, input.boardIds);
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1), boardId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.boards.write');
          await ctx.boards.archiveBoard(input.boardId);
          return { ok: true };
        }),
    }),

    invitations: router({
      create: protectedProcedure
        .input(
          z.object({
            workspaceId: z.string().min(1),
            role: z.enum(['admin', 'maintainer', 'editor', 'viewer']).optional(),
            expiresInDays: z.number().int().min(1).max(30).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { role: actorRole } = await requireWorkspacePermission(
            ctx,
            input.workspaceId,
            'workspace.members.write',
          );
          const role = asRole(input.role) ?? 'viewer';
          if (!canAssignRole(actorRole, role)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot invite with this role' });
          }
          const token = randomToken();
          const expiresAt = addDaysIso(input.expiresInDays ?? 7);
          return await ctx.workspaces.createInvitation(input.workspaceId, {
            token,
            role,
            createdBy: ctx.user!.id,
            expiresAt,
          });
        }),

      list: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.members.write');
          return await ctx.workspaces.listPendingInvitations(input.workspaceId);
        }),

      cancel: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1), invitationId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.members.write');
          const inv = await ctx.workspaces.getInvitation(input.workspaceId, input.invitationId);
          if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
          await ctx.workspaces.cancelInvitation(input.workspaceId, input.invitationId, ctx.user!.id);
          return { ok: true };
        }),

      accept: protectedProcedure
        .input(z.object({ token: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const inv = await ctx.workspaces.acceptInvitationByToken(input.token, ctx.user!.id);
          await safeNotify(
            ctx.notifications.create(inv.createdBy, {
              type: 'workspace_invitation_accepted',
              title: `Invitation acceptée`,
              body: `Un membre a accepté votre invitation.`,
              actorId: ctx.user!.id,
              data: { workspaceId: inv.workspaceId, invitationId: inv.id },
            }),
          );
          return inv;
        }),

      decline: protectedProcedure
        .input(z.object({ token: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const inv = await ctx.workspaces.declineInvitationByToken(input.token, ctx.user!.id);
          await safeNotify(
            ctx.notifications.create(inv.createdBy, {
              type: 'workspace_invitation_declined',
              title: `Invitation refusée`,
              body: `Un membre a refusé votre invitation.`,
              actorId: ctx.user!.id,
              data: { workspaceId: inv.workspaceId, invitationId: inv.id },
            }),
          );
          return inv;
        }),
    }),
  }),
  tickets: router({
    get: protectedProcedure
      .input(z.object({ ticketId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { ticket, role } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
        const grants = ticketRolePermissions[role] ?? [];
        const canAssignmentsRead = hasPermission(grants, 'ticket.assignments.read');
        return {
          ...ticket,
          assigneeIds: canAssignmentsRead ? ticket.assigneeIds : undefined,
          permissions: {
            role,
            canContentWrite: hasPermission(grants, 'ticket.content.write'),
            canCommentsRead: hasPermission(grants, 'ticket.comments.read'),
            canCommentsWrite: hasPermission(grants, 'ticket.comments.write'),
            canAssignmentsRead: hasPermission(grants, 'ticket.assignments.read'),
            canAssignmentsWrite: hasPermission(grants, 'ticket.assignments.write'),
          },
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          ticketId: z.string().min(1),
          title: z.string().min(1).max(200).optional(),
          description: z.string().optional(),
          dueDate: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { ticket: before, workspaceId } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
        const patch: { title?: string; description?: string; dueDate?: string | null } = {};
        if (typeof input.title === 'string') patch.title = input.title.trim();
        if (typeof input.description === 'string') {
          await requireMentionUsersInWorkspace(ctx, workspaceId, input.description);
          patch.description = input.description;
        }
        if (input.dueDate === null || typeof input.dueDate === 'string') patch.dueDate = input.dueDate;
        const updated = await ctx.tickets.update(input.ticketId, patch);

        // Notify newly mentioned users in description (avoid spamming on unrelated updates)
        if (typeof input.description === 'string') {
          const added = await diffMentionUserIds(ctx, workspaceId, before.description ?? '', input.description);
          const targets = added.filter((id) => id !== ctx.user!.id);
          await Promise.all(
            targets.map((userId) =>
              safeNotify(
                ctx.notifications.create(userId, {
                  type: 'ticket_mentioned',
                  title: `Mention dans "${before.title}"`,
                  body: `Vous avez été mentionné dans la description.`,
                  actorId: ctx.user!.id,
                  data: { ticketId: before.id, boardId: before.boardId },
                }),
              ),
            ),
          );
        }

        await safeLog(
          ctx.activityLogs.create(before.boardId, {
            ticketId: before.id,
            type: 'ticket_updated',
            actorId: ctx.user!.id,
            data: { patch },
          }),
        );
        return updated;
      }),

    remove: protectedProcedure
      .input(z.object({ ticketId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
        await ctx.tickets.archive(input.ticketId);
        await safeLog(
          ctx.activityLogs.create(ticket.boardId, {
            ticketId: ticket.id,
            type: 'ticket_archived',
            actorId: ctx.user!.id,
            data: {},
          }),
        );
        return { ok: true };
      }),

    reminders: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.ticketReminders.list(input.ticketId, { userId: ctx.user!.id });
        }),

      create: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), remindAt: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.ticketReminders.create(input.ticketId, { userId: ctx.user!.id, remindAt: input.remindAt });
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), reminderId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          await ctx.ticketReminders.remove(input.ticketId, input.reminderId, { userId: ctx.user!.id });
          return { ok: true };
        }),
    }),

    comments: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.read');
          return await ctx.tickets.listComments(input.ticketId);
        }),

      add: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), content: z.string().min(1).max(10000) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket, workspaceId } = await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          await requireMentionUsersInWorkspace(ctx, workspaceId, input.content);
          const comment = await ctx.tickets.addComment(input.ticketId, { authorId: ctx.user!.id, content: input.content.trim() });

          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_comment_added',
              actorId: ctx.user!.id,
              data: { commentId: comment.id },
            }),
          );

          const watcherIds = await ctx.tickets.listWatchUserIds(input.ticketId);
          const targets = watcherIds.filter((id) => id !== ctx.user!.id);
          const snippet = input.content.trim().slice(0, 140);
          await Promise.all(
            targets.map((userId) =>
              safeNotify(
                ctx.notifications.create(userId, {
                  type: 'ticket_comment_added',
                  title: `Nouveau commentaire: "${ticket.title}"`,
                  body: snippet.length ? snippet : null,
                  actorId: ctx.user!.id,
                  data: { ticketId: ticket.id, boardId: ticket.boardId, commentId: comment.id },
                }),
              ),
            ),
          );

          const mentioned = await resolveMentionUserIds(ctx, workspaceId, input.content);
          const mentionTargets = mentioned.filter((id) => id !== ctx.user!.id);
          await Promise.all(
            mentionTargets.map((userId) =>
              safeNotify(
                ctx.notifications.create(userId, {
                  type: 'ticket_mentioned',
                  title: `Mention dans "${ticket.title}"`,
                  body: snippet.length ? snippet : 'Vous avez été mentionné dans un commentaire.',
                  actorId: ctx.user!.id,
                  data: { ticketId: ticket.id, boardId: ticket.boardId, commentId: comment.id },
                }),
              ),
            ),
          );

          return comment;
        }),

      update: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), commentId: z.string().min(1), content: z.string().min(1).max(10000) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket, workspaceId } = await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          await requireMentionUsersInWorkspace(ctx, workspaceId, input.content);
          const beforeComments = await ctx.tickets.listComments(input.ticketId);
          const before = beforeComments.find((c) => c.id === input.commentId)?.content ?? '';
          const updated = await ctx.tickets.updateComment(input.ticketId, input.commentId, { content: input.content.trim() });

          const added = await diffMentionUserIds(ctx, workspaceId, before, input.content);
          const targets = added.filter((id) => id !== ctx.user!.id);
          const snippet = input.content.trim().slice(0, 140);
          await Promise.all(
            targets.map((userId) =>
              safeNotify(
                ctx.notifications.create(userId, {
                  type: 'ticket_mentioned',
                  title: `Mention dans "${ticket.title}"`,
                  body: snippet.length ? snippet : 'Vous avez été mentionné dans un commentaire.',
                  actorId: ctx.user!.id,
                  data: { ticketId: ticket.id, boardId: ticket.boardId, commentId: updated.id },
                }),
              ),
            ),
          );

          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_comment_updated',
              actorId: ctx.user!.id,
              data: { commentId: input.commentId },
            }),
          );
          return updated;
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), commentId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          await ctx.tickets.deleteComment(input.ticketId, input.commentId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_comment_deleted',
              actorId: ctx.user!.id,
              data: { commentId: input.commentId },
            }),
          );
          return { ok: true };
        }),
    }),

    assignees: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.assignments.read');
          const assigneeIds = await ctx.tickets.getAssigneeIds(input.ticketId);
          return { assigneeIds };
        }),

      add: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.assignments.write');
          const exists = await ctx.users.getById(input.userId);
          if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
          await ctx.tickets.addAssignee(input.ticketId, input.userId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_assignee_added',
              actorId: ctx.user!.id,
              data: { userId: input.userId },
            }),
          );
          if (input.userId !== ctx.user!.id) {
            await safeNotify(
              ctx.notifications.create(input.userId, {
                type: 'ticket_assigned',
                title: `Vous avez été assigné à "${ticket.title}"`,
                body: null,
                actorId: ctx.user!.id,
                data: { ticketId: ticket.id, boardId: ticket.boardId },
              }),
            );
          }
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.assignments.write');
          await ctx.tickets.removeAssignee(input.ticketId, input.userId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_assignee_removed',
              actorId: ctx.user!.id,
              data: { userId: input.userId },
            }),
          );
          if (input.userId !== ctx.user!.id) {
            await safeNotify(
              ctx.notifications.create(input.userId, {
                type: 'ticket_unassigned',
                title: `Vous avez été désassigné de "${ticket.title}"`,
                body: null,
                actorId: ctx.user!.id,
                data: { ticketId: ticket.id, boardId: ticket.boardId },
              }),
            );
          }
          return { ok: true };
        }),
    }),

    watch: router({
      get: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.tickets.getWatchStatus(input.ticketId, ctx.user!.id);
        }),

      watch: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          await ctx.tickets.setWatchStatus(input.ticketId, ctx.user!.id, true);
          return { ok: true };
        }),

      unwatch: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          await ctx.tickets.setWatchStatus(input.ticketId, ctx.user!.id, false);
          return { ok: true };
        }),
    }),

    labels: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          const labelIds = await ctx.tickets.getLabelIds(input.ticketId);
          return { labelIds };
        }),

      add: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), labelId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          await ctx.tickets.addLabel(input.ticketId, input.labelId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_label_added',
              actorId: ctx.user!.id,
              data: { labelId: input.labelId },
            }),
          );
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), labelId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          await ctx.tickets.removeLabel(input.ticketId, input.labelId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_label_removed',
              actorId: ctx.user!.id,
              data: { labelId: input.labelId },
            }),
          );
          return { ok: true };
        }),
    }),

    checklists: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.tickets.listChecklists(input.ticketId);
        }),

      create: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), title: z.string().min(1).max(200) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          const checklist = await ctx.tickets.createChecklist(input.ticketId, { title: input.title.trim() });
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_checklist_created',
              actorId: ctx.user!.id,
              data: { checklistId: checklist.id },
            }),
          );
          return checklist;
        }),

      update: protectedProcedure
        .input(
          z.object({
            ticketId: z.string().min(1),
            checklistId: z.string().min(1),
            title: z.string().min(1).max(200).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          const patch: { title?: string } = {};
          if (typeof input.title === 'string') patch.title = input.title.trim();
          const updated = await ctx.tickets.updateChecklist(input.ticketId, input.checklistId, patch);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_checklist_updated',
              actorId: ctx.user!.id,
              data: { checklistId: input.checklistId, patch },
            }),
          );
          return updated;
        }),

      reorder: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), checklistIds: z.array(z.string().min(1)).min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          if (new Set(input.checklistIds).size !== input.checklistIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'checklistIds must be unique' });
          }
          await ctx.tickets.reorderChecklists(input.ticketId, input.checklistIds);
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), checklistId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          await ctx.tickets.deleteChecklist(input.ticketId, input.checklistId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_checklist_deleted',
              actorId: ctx.user!.id,
              data: { checklistId: input.checklistId },
            }),
          );
          return { ok: true };
        }),

      items: router({
        add: protectedProcedure
          .input(z.object({ ticketId: z.string().min(1), checklistId: z.string().min(1), content: z.string().min(1).max(2000) }))
          .mutation(async ({ ctx, input }) => {
            const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
            const item = await ctx.tickets.addChecklistItem(input.ticketId, input.checklistId, { content: input.content.trim() });
            await safeLog(
              ctx.activityLogs.create(ticket.boardId, {
                ticketId: ticket.id,
                type: 'ticket_checklist_item_added',
                actorId: ctx.user!.id,
                data: { checklistId: input.checklistId, itemId: item.id },
              }),
            );
            return item;
          }),

        update: protectedProcedure
          .input(
            z.object({
              ticketId: z.string().min(1),
              checklistId: z.string().min(1),
              itemId: z.string().min(1),
              content: z.string().min(1).max(2000).optional(),
              isDone: z.boolean().optional(),
            }),
          )
          .mutation(async ({ ctx, input }) => {
            const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
            const patch: { content?: string; isDone?: boolean } = {};
            if (typeof input.content === 'string') patch.content = input.content.trim();
            if (typeof input.isDone === 'boolean') patch.isDone = input.isDone;
            if (Object.keys(patch).length === 0) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing to update' });
            }
            const updated = await ctx.tickets.updateChecklistItem(input.ticketId, input.checklistId, input.itemId, patch);
            await safeLog(
              ctx.activityLogs.create(ticket.boardId, {
                ticketId: ticket.id,
                type: 'ticket_checklist_item_updated',
                actorId: ctx.user!.id,
                data: { checklistId: input.checklistId, itemId: input.itemId, patch },
              }),
            );
            return updated;
          }),

        reorder: protectedProcedure
          .input(z.object({ ticketId: z.string().min(1), checklistId: z.string().min(1), itemIds: z.array(z.string().min(1)).min(1) }))
          .mutation(async ({ ctx, input }) => {
            await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
            if (new Set(input.itemIds).size !== input.itemIds.length) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'itemIds must be unique' });
            }
            await ctx.tickets.reorderChecklistItems(input.ticketId, input.checklistId, input.itemIds);
            return { ok: true };
          }),

        remove: protectedProcedure
          .input(z.object({ ticketId: z.string().min(1), checklistId: z.string().min(1), itemId: z.string().min(1) }))
          .mutation(async ({ ctx, input }) => {
            const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
            await ctx.tickets.deleteChecklistItem(input.ticketId, input.checklistId, input.itemId);
            await safeLog(
              ctx.activityLogs.create(ticket.boardId, {
                ticketId: ticket.id,
                type: 'ticket_checklist_item_deleted',
                actorId: ctx.user!.id,
                data: { checklistId: input.checklistId, itemId: input.itemId },
              }),
            );
            return { ok: true };
          }),
      }),
    }),

    attachments: router({
      list: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.tickets.listAttachments(input.ticketId);
        }),

      createUpload: protectedProcedure
        .input(
          z.object({
            ticketId: z.string().min(1),
            filename: z.string().min(1).max(200),
            contentType: z.string().min(1).max(200),
            resumable: z.boolean().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          const res = await ctx.tickets.createAttachmentUpload(input.ticketId, {
            filename: input.filename.trim(),
            contentType: input.contentType.trim(),
            resumable: input.resumable,
          });
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_attachment_upload_created',
              actorId: ctx.user!.id,
              data: { attachmentId: res.attachment.id, filename: res.attachment.filename },
            }),
          );
          return res;
        }),

      complete: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), attachmentId: z.string().min(1), size: z.number().int().min(0).optional() }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          const att = await ctx.tickets.completeAttachment(input.ticketId, input.attachmentId, { size: input.size });

          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_attachment_uploaded',
              actorId: ctx.user!.id,
              data: { attachmentId: att.id, filename: att.filename, size: att.size ?? null },
            }),
          );

          const watcherIds = await ctx.tickets.listWatchUserIds(input.ticketId);
          const targets = watcherIds.filter((id) => id !== ctx.user!.id);
          await Promise.all(
            targets.map((userId) =>
              safeNotify(
                ctx.notifications.create(userId, {
                  type: 'ticket_attachment_uploaded',
                  title: `Pièce jointe ajoutée: "${ticket.title}"`,
                  body: att.filename ?? null,
                  actorId: ctx.user!.id,
                  data: { ticketId: ticket.id, boardId: ticket.boardId, attachmentId: att.id },
                }),
              ),
            ),
          );

          return att;
        }),

      download: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), attachmentId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.tickets.getAttachmentDownload(input.ticketId, input.attachmentId);
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), attachmentId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
          await ctx.tickets.removeAttachment(input.ticketId, input.attachmentId);
          await safeLog(
            ctx.activityLogs.create(ticket.boardId, {
              ticketId: ticket.id,
              type: 'ticket_attachment_removed',
              actorId: ctx.user!.id,
              data: { attachmentId: input.attachmentId },
            }),
          );
          return { ok: true };
        }),
    }),

    activity: router({
      list: protectedProcedure
        .input(
          z.object({
            ticketId: z.string().min(1),
            limit: z.number().int().min(1).max(50).default(20),
            cursor: z.string().min(1).nullable().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { ticket } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
          return await ctx.activityLogs.listForTicket(ticket.boardId, input.ticketId, {
            limit: input.limit,
            cursor: input.cursor ?? null,
          });
        }),
    }),
  }),
  boards: router({
      listBackgrounds: protectedProcedure
        .input(
          z.object({
            type: z.enum(['color', 'gradient', 'image']),
            limit: z.number().int().min(1).max(50).default(20),
            cursor: z.string().min(1).nullable().optional(),
            query: z.string().min(1).nullable().optional(),
          }),
        )
        .query(({ ctx, input }) =>
          ctx.boardBackgrounds.list({
            type: input.type,
            limit: input.limit,
            cursor: input.cursor ?? null,
            query: input.query ?? null,
          }),
        ),

    view: protectedProcedure
      .input(z.object({ boardId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { board, grants } = await requireBoardPermission(ctx, input.boardId, 'board.meta.read');
        const canColumnsRead = hasPermission(grants, 'board.columns.read');
        const canTicketsRead = hasPermission(grants, 'board.tickets.read');
        const canTicketContentRead = hasPermission(grants, 'ticket.content.read');

        const [columns, tickets] = await Promise.all([
          canColumnsRead ? ctx.boards.listColumns(input.boardId) : Promise.resolve([]),
          canTicketsRead ? ctx.boards.listTickets(input.boardId) : Promise.resolve([]),
        ]);

        const safeTickets = tickets.map((t) => ({
          ...t,
          description: canTicketContentRead ? t.description : undefined,
        }));

        return {
          board,
          columns,
          tickets: safeTickets,
          permissions: {
            canMetaWrite: hasPermission(grants, 'board.meta.write'),
            canLabelsWrite: hasPermission(grants, 'board.meta.write'),
            canBackgroundWrite:
              hasPermission(grants, 'board.meta.write') || hasPermission(grants, 'board.tickets.write'),
          },
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          boardId: z.string().min(1),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(2000).optional(),
          background: z.union([boardBackgroundSchema, z.string().min(1)]).nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { board, grants } = await requireBoardPermission(ctx, input.boardId, 'board.meta.read');
        const wantsTitle = typeof input.title === 'string';
        const wantsDescription = typeof input.description === 'string';
        const wantsBackground = input.background !== undefined;
        if (wantsTitle || wantsDescription) {
          if (!hasPermission(grants, 'board.meta.write')) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
          }
        } else if (wantsBackground) {
          if (!hasPermission(grants, 'board.meta.write') && !hasPermission(grants, 'board.tickets.write')) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Missing permission' });
          }
        }
        const patch: { title?: string; description?: string; background?: BoardBackground | null } = {};
        if (typeof input.title === 'string') patch.title = input.title.trim();
        if (typeof input.description === 'string') patch.description = input.description.trim();
        if (input.background === null) {
          patch.background = null;
        } else if (typeof input.background === 'string') {
          const value = input.background.trim();
          if (value) patch.background = { type: 'color', value };
        } else if (input.background) {
          patch.background = normalizeBoardBackground(input.background);
        }
        const updated = await ctx.boards.updateBoard(input.boardId, patch);
        await safeLog(
          ctx.activityLogs.create(board.id, {
            type: 'board_updated',
            actorId: ctx.user!.id,
            data: { patch },
          }),
        );
        return updated;
      }),

    columns: router({
      create: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), title: z.string().min(1).max(200), key: z.string().min(1).max(64).optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.columns.write');
          const key =
            (input.key?.trim() ||
              input.title
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 48) ||
              'column') + '_' + crypto.randomBytes(4).toString('hex');
          const col = await ctx.boards.createColumn(input.boardId, { title: input.title.trim(), key });
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_column_created',
              actorId: ctx.user!.id,
              data: { columnId: col.id },
            }),
          );
          return col;
        }),

      update: protectedProcedure
        .input(
          z.object({
            boardId: z.string().min(1),
            columnId: z.string().min(1),
            title: z.string().min(1).max(200).optional(),
            key: z.string().min(1).max(64).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.columns.write');
          const patch: { title?: string; key?: string } = {};
          if (typeof input.title === 'string') patch.title = input.title.trim();
          if (typeof input.key === 'string') patch.key = input.key.trim();
          const updated = await ctx.boards.updateColumn(input.boardId, input.columnId, patch);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_column_updated',
              actorId: ctx.user!.id,
              data: { columnId: input.columnId, patch },
            }),
          );
          return updated;
        }),

      remove: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), columnId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.columns.write');
          await ctx.boards.deleteColumn(input.boardId, input.columnId);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_column_deleted',
              actorId: ctx.user!.id,
              data: { columnId: input.columnId },
            }),
          );
          return { ok: true };
        }),

      reorder: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), columnIds: z.array(z.string().min(1)).min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.columns.write');
          if (new Set(input.columnIds).size !== input.columnIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'columnIds must be unique' });
          }
          await ctx.boards.reorderColumns(input.boardId, input.columnIds);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_columns_reordered',
              actorId: ctx.user!.id,
              data: { columnIds: input.columnIds },
            }),
          );
          return { ok: true };
        }),
    }),

    labels: router({
      list: protectedProcedure
        .input(z.object({ boardId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.read');
          return await ctx.boards.listLabels(input.boardId);
        }),

      create: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), name: z.string().min(1).max(80), color: z.string().nullable().optional() }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.write');
          const name = input.name.trim();
          const color = input.color ?? null;
          const label = await ctx.boards.createLabel(input.boardId, { name, color });
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_label_created',
              actorId: ctx.user!.id,
              data: { labelId: label.id },
            }),
          );
          return label;
        }),

      update: protectedProcedure
        .input(
          z.object({
            boardId: z.string().min(1),
            labelId: z.string().min(1),
            name: z.string().min(1).max(80).optional(),
            color: z.string().min(1).max(16).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.write');
          const patch: { name?: string; color?: string } = {};
          if (typeof input.name === 'string') patch.name = input.name.trim();
          if (typeof input.color === 'string') patch.color = input.color.trim();
          if (Object.keys(patch).length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing to update' });
          const updated = await ctx.boards.updateLabel(input.boardId, input.labelId, patch);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_label_updated',
              actorId: ctx.user!.id,
              data: { labelId: input.labelId, patch },
            }),
          );
          return updated;
        }),

      reorder: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), labelIds: z.array(z.string().min(1)).min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.write');
          if (new Set(input.labelIds).size !== input.labelIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'labelIds must be unique' });
          }
          await ctx.boards.reorderLabels(input.boardId, input.labelIds);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_labels_reordered',
              actorId: ctx.user!.id,
              data: { labelIds: input.labelIds },
            }),
          );
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), labelId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.write');
          await ctx.boards.deleteLabel(input.boardId, input.labelId);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              type: 'board_label_deleted',
              actorId: ctx.user!.id,
              data: { labelId: input.labelId },
            }),
          );
          return { ok: true };
        }),
    }),

    tickets: router({
      create: protectedProcedure
        .input(
          z.object({
            boardId: z.string().min(1),
            columnId: z.string().min(1),
            title: z.string().min(1).max(200),
            description: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.tickets.write');
          const ticket = await ctx.boards.createTicket(input.boardId, {
            columnId: input.columnId,
            title: input.title.trim(),
            description: input.description ?? '',
          });
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              ticketId: ticket.id,
              type: 'ticket_created',
              actorId: ctx.user!.id,
              data: { columnId: ticket.columnId, title: ticket.title },
            }),
          );
          return ticket;
        }),

      move: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), ticketId: z.string().min(1), columnId: z.string().min(1), position: z.number().int().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.tickets.write');
          const before = await ctx.tickets.getById(input.ticketId);
          await ctx.boards.moveTicket(input.boardId, input.ticketId, { columnId: input.columnId, position: input.position });
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              ticketId: input.ticketId,
              type: 'ticket_moved',
              actorId: ctx.user!.id,
              data: { fromColumnId: before?.columnId ?? null, toColumnId: input.columnId, position: input.position },
            }),
          );
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), ticketId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.tickets.write');
          await ctx.boards.archiveTicket(input.boardId, input.ticketId);
          await safeLog(
            ctx.activityLogs.create(input.boardId, {
              ticketId: input.ticketId,
              type: 'ticket_archived',
              actorId: ctx.user!.id,
              data: {},
            }),
          );
          return { ok: true };
        }),
    }),

    activity: router({
      list: protectedProcedure
        .input(
          z.object({
            boardId: z.string().min(1),
            limit: z.number().int().min(1).max(50).default(20),
            cursor: z.string().min(1).nullable().optional(),
            includeTickets: z.boolean().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.meta.read');
          return await ctx.activityLogs.listForBoard(input.boardId, {
            limit: input.limit,
            cursor: input.cursor ?? null,
            includeTickets: input.includeTickets ?? true,
          });
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;


