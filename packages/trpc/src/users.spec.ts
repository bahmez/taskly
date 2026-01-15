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
      avatar: null,
      createdAt: '',
      updatedAt: '',
    },
    users: {
      getById: vi.fn(async () => null),
      search: vi.fn(async () => []),
      updateMe: vi.fn(async (_id, patch) => ({
        id: 'u1',
        username: 'u',
        first_name: 'U',
        last_name: 'One',
        description: '',
        avatar: (patch as { avatar?: unknown }).avatar ?? null,
        createdAt: '',
        updatedAt: '',
      })),
      deleteMe: vi.fn(async () => {}),
      createAvatarUpload: vi.fn(async () => ({
        objectPath: 'users/u1/avatar/file.png',
        upload: { url: 'https://upload', method: 'PUT', headers: {} },
      })),
      getAvatarDownload: vi.fn(async () => ({
        url: 'https://download',
        method: 'GET',
        headers: {},
      })),
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
      getBoardById: vi.fn(async () => null),
      updateBoard: vi.fn(async () => ({ id: 'b1', workspaceId: 'w1', title: 'B', description: '', background: null, order: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
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
    boardBackgrounds: {
      list: vi.fn(async () => ({ items: [], nextCursor: null })),
    },
    tickets: {
      getById: vi.fn(async () => null),
      update: vi.fn(async () => ({ id: 't1', boardId: 'b1', columnId: 'c1', title: 'T', description: '', dueDate: null, assigneeIds: [], labelIds: [], position: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
      archive: vi.fn(async () => {}),
      listComments: vi.fn(async () => []),
      addComment: vi.fn(async () => ({ id: 'cm1', ticketId: 't1', authorId: 'u1', content: 'hi', createdAt: '', updatedAt: '' })),
      updateComment: vi.fn(async () => ({ id: 'cm1', ticketId: 't1', authorId: 'u1', content: 'hi', createdAt: '', updatedAt: '' })),
      deleteComment: vi.fn(async () => {}),
      getAssigneeIds: vi.fn(async () => []),
      addAssignee: vi.fn(async () => {}),
      removeAssignee: vi.fn(async () => {}),
      getWatchStatus: vi.fn(async () => ({ isWatching: false, isExplicit: false })),
      setWatchStatus: vi.fn(async () => {}),
      listWatchUserIds: vi.fn(async () => []),
      getLabelIds: vi.fn(async () => []),
      addLabel: vi.fn(async () => {}),
      removeLabel: vi.fn(async () => {}),
      listChecklists: vi.fn(async () => []),
      createChecklist: vi.fn(async () => ({ id: 'cl1', ticketId: 't1', title: 'Checklist', position: 1, createdAt: '', updatedAt: '', items: [] })),
      updateChecklist: vi.fn(async () => ({ id: 'cl1', ticketId: 't1', title: 'Checklist', position: 1, createdAt: '', updatedAt: '', items: [] })),
      deleteChecklist: vi.fn(async () => {}),
      reorderChecklists: vi.fn(async () => {}),
      addChecklistItem: vi.fn(async () => ({ id: 'cli1', ticketId: 't1', checklistId: 'cl1', content: 'Item', isDone: false, position: 1, createdAt: '', updatedAt: '' })),
      updateChecklistItem: vi.fn(async () => ({ id: 'cli1', ticketId: 't1', checklistId: 'cl1', content: 'Item', isDone: false, position: 1, createdAt: '', updatedAt: '' })),
      deleteChecklistItem: vi.fn(async () => {}),
      reorderChecklistItems: vi.fn(async () => {}),
      listAttachments: vi.fn(async () => []),
      createAttachmentUpload: vi.fn(async () => ({ attachment: { id: 'a1', ticketId: 't1', createdBy: 'u1', filename: 'x', contentType: 'text/plain', objectPath: 'p', status: 'pending', size: null, createdAt: '', updatedAt: '' }, upload: { url: 'u', method: 'PUT', headers: {} } })),
      completeAttachment: vi.fn(async () => ({ id: 'a1', ticketId: 't1', createdBy: 'u1', filename: 'x', contentType: 'text/plain', objectPath: 'p', status: 'uploaded', size: 1, createdAt: '', updatedAt: '' })),
      getAttachmentDownload: vi.fn(async () => ({ attachment: { id: 'a1', ticketId: 't1', createdBy: 'u1', filename: 'x', contentType: 'text/plain', objectPath: 'p', status: 'uploaded', size: 1, createdAt: '', updatedAt: '' }, download: { url: 'u', method: 'GET', headers: {} } })),
      removeAttachment: vi.fn(async () => {}),
    },
    ticketReminders: {
      list: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      remove: vi.fn(async () => ({})),
    },
    notifications: {
      create: vi.fn(async () => ({})),
      list: vi.fn(async () => ({ items: [], nextCursor: null })),
      countUnread: vi.fn(async () => 0),
      markRead: vi.fn(async () => {}),
      markAllRead: vi.fn(async () => {}),
    },
    activityLogs: {
      create: vi.fn(async () => ({})),
      listForBoard: vi.fn(async () => ({ items: [], nextCursor: null })),
      listForTicket: vi.fn(async () => ({ items: [], nextCursor: null })),
    },
  };
  return { ...base, ...overrides };
}

describe('users.avatar', () => {
  it('setInitialsBackground updates avatar', async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.users.avatar.setInitialsBackground({ background: { type: 'color', value: '#0EA5E9' } });

    expect(ctx.users.updateMe).toHaveBeenCalledWith(ctx.user!.id, {
      avatar: { type: 'initials', background: { type: 'color', value: '#0EA5E9' } },
    });
  });

  it('completeUpload returns download url', async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const res = await caller.users.avatar.completeUpload({ objectPath: 'users/u1/avatar/file.png' });

    expect(res.download.url).toBe('https://download');
    expect(ctx.users.getAvatarDownload).toHaveBeenCalledWith('users/u1/avatar/file.png');
  });
});

