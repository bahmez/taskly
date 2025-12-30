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
  background: string | null;
  order: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardColumn = {
  id: string;
  boardId: string;
  title: string;
  key: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  dueDate: string | null;
  assigneeIds?: string[];
  position: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
  updateBoard: (boardId: string, patch: { title?: string; description?: string; background?: string | null }) => Promise<Board>;
  archiveBoard: (boardId: string) => Promise<void>;

  listBoardsForWorkspace: (workspaceId: string) => Promise<Board[]>;
  createBoard: (input: { workspaceId: string; title: string; description?: string; background?: string | null }) => Promise<Board>;
  reorderBoards: (workspaceId: string, boardIds: string[]) => Promise<void>;

  listColumns: (boardId: string) => Promise<BoardColumn[]>;
  createColumn: (boardId: string, input: { title: string; key: string }) => Promise<BoardColumn>;
  updateColumn: (boardId: string, columnId: string, patch: { title?: string; key?: string }) => Promise<BoardColumn>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;

  listTickets: (boardId: string) => Promise<Ticket[]>;
  listTicketsByColumn: (boardId: string, columnId: string) => Promise<Ticket[]>;
  createTicket: (
    boardId: string,
    input: { columnId: string; title: string; description?: string; dueDate?: string | null; assigneeIds?: string[] },
  ) => Promise<Ticket>;
  moveTicket: (boardId: string, ticketId: string, input: { columnId: string; position: number }) => Promise<void>;
  archiveTicket: (boardId: string, ticketId: string) => Promise<void>;
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
};

export type Context = {
  user: User | null;
  users: UsersContext;
  workspaces: WorkspacesContext;
  boards: BoardsContext;
  tickets: TicketsContext;
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
  users: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),

    byId: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const user = await ctx.users.getById(input.id);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        return user;
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
          const { role: actorRole } = await requireWorkspacePermission(
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
          return await ctx.workspaces.upsertMember(input.workspaceId, input.userId, role);
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
          const { role: actorRole } = await requireWorkspacePermission(
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

          return await ctx.workspaces.upsertMember(input.workspaceId, input.userId, role);
        }),

      remove: protectedProcedure
        .input(z.object({ workspaceId: z.string().min(1), userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.members.write');
          const before = await ctx.workspaces.getMember(input.workspaceId, input.userId);
          if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
          if (before.role === 'admin') {
            const admins = await ctx.workspaces.countAdmins(input.workspaceId);
            if (admins <= 1) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the last admin' });
            }
          }
          await ctx.workspaces.removeMember(input.workspaceId, input.userId);
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
          }),
        )
        .mutation(async ({ ctx, input }) => {
          await requireWorkspacePermission(ctx, input.workspaceId, 'workspace.boards.write');
          return await ctx.boards.createBoard({
            workspaceId: input.workspaceId,
            title: input.title.trim(),
            background: input.backgroundColor ?? null,
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
        .mutation(({ ctx, input }) => ctx.workspaces.acceptInvitationByToken(input.token, ctx.user!.id)),

      decline: protectedProcedure
        .input(z.object({ token: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          ctx.workspaces.declineInvitationByToken(input.token, ctx.user!.id),
        ),
    }),
  }),
  tickets: router({
    get: protectedProcedure
      .input(z.object({ ticketId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { ticket, role } = await requireTicketPermission(ctx, input.ticketId, 'ticket.content.read');
        const canAssignmentsRead = hasPermission(ticketRolePermissions[role] ?? [], 'ticket.assignments.read');
        return {
          ...ticket,
          assigneeIds: canAssignmentsRead ? ticket.assigneeIds : undefined,
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
        await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
        const patch: { title?: string; description?: string; dueDate?: string | null } = {};
        if (typeof input.title === 'string') patch.title = input.title.trim();
        if (typeof input.description === 'string') patch.description = input.description;
        if (input.dueDate === null || typeof input.dueDate === 'string') patch.dueDate = input.dueDate;
        return await ctx.tickets.update(input.ticketId, patch);
      }),

    remove: protectedProcedure
      .input(z.object({ ticketId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await requireTicketPermission(ctx, input.ticketId, 'ticket.content.write');
        await ctx.tickets.archive(input.ticketId);
        return { ok: true };
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
          await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          return await ctx.tickets.addComment(input.ticketId, { authorId: ctx.user!.id, content: input.content.trim() });
        }),

      update: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), commentId: z.string().min(1), content: z.string().min(1).max(10000) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          return await ctx.tickets.updateComment(input.ticketId, input.commentId, { content: input.content.trim() });
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), commentId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.comments.write');
          await ctx.tickets.deleteComment(input.ticketId, input.commentId);
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
          await requireTicketPermission(ctx, input.ticketId, 'ticket.assignments.write');
          const exists = await ctx.users.getById(input.userId);
          if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
          await ctx.tickets.addAssignee(input.ticketId, input.userId);
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ ticketId: z.string().min(1), userId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireTicketPermission(ctx, input.ticketId, 'ticket.assignments.write');
          await ctx.tickets.removeAssignee(input.ticketId, input.userId);
          return { ok: true };
        }),
    }),
  }),
  boards: router({
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
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          boardId: z.string().min(1),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(2000).optional(),
          background: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireBoardPermission(ctx, input.boardId, 'board.meta.write');
        const patch: { title?: string; description?: string; background?: string | null } = {};
        if (typeof input.title === 'string') patch.title = input.title.trim();
        if (typeof input.description === 'string') patch.description = input.description.trim();
        if (input.background === null || typeof input.background === 'string') patch.background = input.background;
        return await ctx.boards.updateBoard(input.boardId, patch);
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
          return await ctx.boards.createColumn(input.boardId, { title: input.title.trim(), key });
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
          return await ctx.boards.updateColumn(input.boardId, input.columnId, patch);
        }),

      remove: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), columnId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.columns.write');
          await ctx.boards.deleteColumn(input.boardId, input.columnId);
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
          return await ctx.boards.createTicket(input.boardId, {
            columnId: input.columnId,
            title: input.title.trim(),
            description: input.description ?? '',
          });
        }),

      move: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), ticketId: z.string().min(1), columnId: z.string().min(1), position: z.number().int().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.tickets.write');
          await ctx.boards.moveTicket(input.boardId, input.ticketId, { columnId: input.columnId, position: input.position });
          return { ok: true };
        }),

      remove: protectedProcedure
        .input(z.object({ boardId: z.string().min(1), ticketId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          await requireBoardPermission(ctx, input.boardId, 'board.tickets.write');
          await ctx.boards.archiveTicket(input.boardId, input.ticketId);
          return { ok: true };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;


