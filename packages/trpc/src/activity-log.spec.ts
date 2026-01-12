import { describe, expect, it, vi } from 'vitest';
import { appRouter } from './index';
import type { Context } from './index';

function makeCtx(overrides: Partial<Context> = {}): Context {
  const base: Context = {
    user: {
      id: 'u1',
      username: 'u',
      first_name: 'U',
      last_name: 'One',
      description: '',
      createdAt: '',
      updatedAt: '',
    },
    users: {
      getById: vi.fn(async () => ({ id: 'u2', username: 'x', first_name: 'X', last_name: 'Y', description: '', createdAt: '', updatedAt: '' })),
      search: vi.fn(async () => []),
      updateMe: vi.fn(async () => ({ id: 'u1', username: 'u', first_name: 'U', last_name: 'One', description: '', createdAt: '', updatedAt: '' })),
      deleteMe: vi.fn(async () => {}),
    },
    workspaces: {
      createWorkspace: vi.fn(async () => ({ id: 'w1', title: 'W', description: '', isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      getWorkspaceById: vi.fn(async () => ({ id: 'w1', title: 'W', description: '', isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      updateWorkspace: vi.fn(async () => ({ id: 'w1', title: 'W', description: '', isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      archiveWorkspace: vi.fn(async () => {}),
      unarchiveWorkspace: vi.fn(async () => {}),
      listWorkspacesForUser: vi.fn(async () => []),
      listArchivedWorkspacesForUser: vi.fn(async () => []),
      getMember: vi.fn(async () => ({ userId: 'u1', role: 'editor' as const, createdAt: '', updatedAt: '' })),
      upsertMember: vi.fn(async () => ({ userId: 'u1', role: 'editor' as const, createdAt: '', updatedAt: '' })),
      removeMember: vi.fn(async () => {}),
      listMembers: vi.fn(async () => []),
      countMembers: vi.fn(async () => 1),
      countAdmins: vi.fn(async () => 1),
      createInvitation: vi.fn(async () => ({ id: 'i1', workspaceId: 'w1', token: 't', role: 'viewer' as const, createdBy: 'u1', createdAt: '', expiresAt: '', acceptedAt: null, acceptedBy: null, declinedAt: null, declinedBy: null, cancelledAt: null, cancelledBy: null })),
      listPendingInvitations: vi.fn(async () => []),
      getInvitation: vi.fn(async () => null),
      cancelInvitation: vi.fn(async () => {}),
      acceptInvitationByToken: vi.fn(async () => ({ id: 'i1', workspaceId: 'w1', token: 't', role: 'viewer' as const, createdBy: 'u1', createdAt: '', expiresAt: '', acceptedAt: '', acceptedBy: 'u1', declinedAt: null, declinedBy: null, cancelledAt: null, cancelledBy: null })),
      declineInvitationByToken: vi.fn(async () => ({ id: 'i1', workspaceId: 'w1', token: 't', role: 'viewer' as const, createdBy: 'u1', createdAt: '', expiresAt: '', acceptedAt: null, acceptedBy: null, declinedAt: '', declinedBy: 'u1', cancelledAt: null, cancelledBy: null })),
    },
    boards: {
      getBoardById: vi.fn(async () => ({ id: 'b1', workspaceId: 'w1', title: 'B', description: '', background: null, order: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      updateBoard: vi.fn(async () => ({ id: 'b1', workspaceId: 'w1', title: 'B2', description: '', background: null, order: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      archiveBoard: vi.fn(async () => {}),
      listBoardsForWorkspace: vi.fn(async () => []),
      createBoard: vi.fn(async () => ({ id: 'b1', workspaceId: 'w1', title: 'B', description: '', background: null, order: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      reorderBoards: vi.fn(async () => {}),
      listColumns: vi.fn(async () => []),
      createColumn: vi.fn(async () => ({ id: 'c1', boardId: 'b1', title: 'Todo', key: 'todo', position: 1, createdAt: '', updatedAt: '' })),
      updateColumn: vi.fn(async () => ({ id: 'c1', boardId: 'b1', title: 'Todo', key: 'todo', position: 1, createdAt: '', updatedAt: '' })),
      deleteColumn: vi.fn(async () => {}),
      reorderColumns: vi.fn(async () => {}),
      listLabels: vi.fn(async () => []),
      createLabel: vi.fn(async () => ({ id: 'l1', boardId: 'b1', name: 'Bug', color: '#f00', position: 1, createdAt: '', updatedAt: '' })),
      updateLabel: vi.fn(async () => ({ id: 'l1', boardId: 'b1', name: 'Bug', color: '#f00', position: 1, createdAt: '', updatedAt: '' })),
      deleteLabel: vi.fn(async () => {}),
      reorderLabels: vi.fn(async () => {}),
      listTickets: vi.fn(async () => []),
      listTicketsByColumn: vi.fn(async () => []),
      createTicket: vi.fn(async () => ({ id: 't1', boardId: 'b1', columnId: 'c1', title: 'T', description: '', dueDate: null, assigneeIds: [], labelIds: [], position: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      moveTicket: vi.fn(async () => {}),
      archiveTicket: vi.fn(async () => {}),
    },
    tickets: {
      getById: vi.fn(async () => ({ id: 't1', boardId: 'b1', columnId: 'c1', title: 'T', description: '', dueDate: null, assigneeIds: [], labelIds: [], position: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      update: vi.fn(async () => ({ id: 't1', boardId: 'b1', columnId: 'c1', title: 'T2', description: '', dueDate: null, assigneeIds: [], labelIds: [], position: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      archive: vi.fn(async () => {}),
      listComments: vi.fn(async () => []),
      addComment: vi.fn(async () => ({ id: 'cm1', ticketId: 't1', authorId: 'u1', content: 'hi', createdAt: '', updatedAt: '' })),
      updateComment: vi.fn(async () => ({ id: 'cm1', ticketId: 't1', authorId: 'u1', content: 'hi', createdAt: '', updatedAt: '' })),
      deleteComment: vi.fn(async () => {}),
      getAssigneeIds: vi.fn(async () => []),
      addAssignee: vi.fn(async () => {}),
      removeAssignee: vi.fn(async () => {}),
      getLabelIds: vi.fn(async () => []),
      addLabel: vi.fn(async () => {}),
      removeLabel: vi.fn(async () => {}),
      listChecklists: vi.fn(async () => []),
      createChecklist: vi.fn(async () => ({ id: 'cl1', ticketId: 't1', title: 'CL', position: 1, createdAt: '', updatedAt: '', items: [] })),
      updateChecklist: vi.fn(async () => ({ id: 'cl1', ticketId: 't1', title: 'CL', position: 1, createdAt: '', updatedAt: '', items: [] })),
      deleteChecklist: vi.fn(async () => {}),
      reorderChecklists: vi.fn(async () => {}),
      addChecklistItem: vi.fn(async () => ({ id: 'it1', ticketId: 't1', checklistId: 'cl1', content: 'x', isDone: false, position: 1, createdAt: '', updatedAt: '' })),
      updateChecklistItem: vi.fn(async () => ({ id: 'it1', ticketId: 't1', checklistId: 'cl1', content: 'x', isDone: false, position: 1, createdAt: '', updatedAt: '' })),
      deleteChecklistItem: vi.fn(async () => {}),
      reorderChecklistItems: vi.fn(async () => {}),
      listAttachments: vi.fn(async () => []),
      createAttachmentUpload: vi.fn<Context['tickets']['createAttachmentUpload']>(async (ticketId, input) => ({
        attachment: {
          id: 'a1',
          ticketId,
          createdBy: 'u1',
          filename: input.filename,
          contentType: input.contentType,
          objectPath: 'p',
          status: 'pending',
          size: null,
          createdAt: '',
          updatedAt: '',
        },
        upload: { url: 'u', method: 'PUT', headers: {}, expiresAt: '', type: 'write' },
      })),
      completeAttachment: vi.fn<Context['tickets']['completeAttachment']>(async (ticketId, attachmentId, patch) => ({
        id: attachmentId,
        ticketId,
        createdBy: 'u1',
        filename: 'f',
        contentType: 'text/plain',
        objectPath: 'p',
        status: 'uploaded',
        size: patch.size ?? 12,
        createdAt: '',
        updatedAt: '',
      })),
      getAttachmentDownload: vi.fn<Context['tickets']['getAttachmentDownload']>(async (ticketId, attachmentId) => ({
        attachment: {
          id: attachmentId,
          ticketId,
          createdBy: 'u1',
          filename: 'f',
          contentType: 'text/plain',
          objectPath: 'p',
          status: 'uploaded',
          size: 12,
          createdAt: '',
          updatedAt: '',
        },
        download: { url: 'u', method: 'GET', headers: {}, expiresAt: '', type: 'read' },
      })),
      removeAttachment: vi.fn(async () => {}),
    },
    notifications: {
      create: vi.fn<Context['notifications']['create']>(async (userId, input) => ({
        id: 'n1',
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? {},
        actorId: input.actorId ?? null,
        createdAt: '',
        createdAtMs: 0,
        readAt: null,
      })),
      list: vi.fn(async () => ({ items: [], nextCursor: null })),
      countUnread: vi.fn(async () => 0),
      markRead: vi.fn(async () => {}),
      markAllRead: vi.fn(async () => {}),
    },
    activityLogs: {
      create: vi.fn<Context['activityLogs']['create']>(async (boardId, input) => ({
        id: 'al1',
        boardId,
        ticketId: input.ticketId ?? null,
        type: input.type,
        actorId: input.actorId ?? null,
        data: input.data ?? {},
        createdAt: '',
        createdAtMs: 0,
      })),
      listForBoard: vi.fn(async () => ({ items: [], nextCursor: null })),
      listForTicket: vi.fn(async () => ({ items: [], nextCursor: null })),
    },
  };
  return { ...base, ...overrides };
}

describe('activity logs (tRPC)', () => {
  it('boards.activity.list delegates to ctx.activityLogs.listForBoard', async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.boards.activity.list({ boardId: 'b1', limit: 10, cursor: null, includeTickets: true });
    expect(ctx.activityLogs.listForBoard).toHaveBeenCalledWith('b1', { limit: 10, cursor: null, includeTickets: true });
  });

  it('tickets.activity.list delegates to ctx.activityLogs.listForTicket using ticket.boardId', async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.tickets.activity.list({ ticketId: 't1', limit: 10, cursor: null });
    expect(ctx.activityLogs.listForTicket).toHaveBeenCalledWith('b1', 't1', { limit: 10, cursor: null });
  });

  it('tickets.update writes an activity log (best-effort)', async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.tickets.update({ ticketId: 't1', title: 'New title' });
    expect(ctx.activityLogs.create).toHaveBeenCalledWith('b1', expect.objectContaining({ ticketId: 't1', type: 'ticket_updated', actorId: 'u1' }));
  });
});

