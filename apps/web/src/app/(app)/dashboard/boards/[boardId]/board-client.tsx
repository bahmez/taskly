'use client';

import React from 'react';
import { api } from '@/app/trpc';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Textarea,
  Avatar,
  AvatarFallback,
  cn,
  useToast,
} from '@taskly/ui';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import { MoreHorizontal, Plus, CheckSquare, Paperclip, MessageSquare } from 'lucide-react';
import TicketDialogV2 from '@/components/ticket/ticket-dialog-v2';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

function getUserInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getOptionalStringProp(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : undefined;
}

export default function BoardClient({ boardId }: { boardId: string }) {
  const utils = api.useUtils();
  const { setSelectedWorkspaceId } = useWorkspaceUI();
  const { toast } = useToast();

  const viewQuery = api.boards.view.useQuery({ boardId });
  const labelsQuery = api.boards.labels.list.useQuery({ boardId });

  React.useEffect(() => {
    if (viewQuery.data?.board?.workspaceId) {
      setSelectedWorkspaceId(viewQuery.data.board.workspaceId);
    }
  }, [viewQuery.data?.board?.workspaceId, setSelectedWorkspaceId]);

  const updateBoard = api.boards.update.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot update board', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const createColumn = api.boards.columns.create.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot create column', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const updateColumn = api.boards.columns.update.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot update column', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const removeColumn = api.boards.columns.remove.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot remove column', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const createTicket = api.boards.tickets.create.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot create ticket', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const moveTicket = api.boards.tickets.move.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot move ticket', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const [newColumnTitle, setNewColumnTitle] = React.useState('');
  const [newCardTitleByColumn, setNewCardTitleByColumn] = React.useState<Record<string, string>>({});
  const [newCardDescByColumn, setNewCardDescByColumn] = React.useState<Record<string, string>>({});

  const [draggingTicketId, setDraggingTicketId] = React.useState<string | null>(null);

  const [isEditingBoardTitle, setIsEditingBoardTitle] = React.useState(false);
  const [boardTitleDraft, setBoardTitleDraft] = React.useState('');

  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(null);
  const [columnTitleDraft, setColumnTitleDraft] = React.useState('');

  const [settingsColumnId, setSettingsColumnId] = React.useState<string | null>(null);
  const [settingsTitleDraft, setSettingsTitleDraft] = React.useState('');

  const [openedTicketId, setOpenedTicketId] = React.useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = React.useState<{ open: boolean; title: string; description?: string; onConfirm: () => void }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const board = viewQuery.data?.board;
  const columns = React.useMemo(() => viewQuery.data?.columns ?? [], [viewQuery.data?.columns]);
  const tickets = React.useMemo(() => viewQuery.data?.tickets ?? [], [viewQuery.data?.tickets]);
  const boardLabels = labelsQuery.data ?? [];

  const allAssigneeIds = React.useMemo<string[]>(() => {
    const ids = tickets.flatMap((t) => t.assigneeIds ?? []);
    return Array.from(new Set(ids));
  }, [tickets]);

  const assigneeUsersQuery = api.users.byIds.useQuery(
    { ids: allAssigneeIds },
    { enabled: allAssigneeIds.length > 0, staleTime: 60_000 },
  );

  const usersById = React.useMemo(() => {
    return new Map((assigneeUsersQuery.data ?? []).map((u) => [u.id, u]));
  }, [assigneeUsersQuery.data]);

  const formatUserPrimary = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return userId;
      const displayName = getOptionalStringProp(u, 'displayName') ?? getOptionalStringProp(u, 'display_name');
      if (typeof displayName === 'string' && displayName.trim()) return displayName.trim();
      const first = getOptionalStringProp(u, 'first_name') ?? '';
      const last = getOptionalStringProp(u, 'last_name') ?? '';
      const full = `${first} ${last}`.trim();
      if (full) return full;
      const username = getOptionalStringProp(u, 'username');
      if (username) return username;
      return userId;
    },
    [usersById],
  );

  const formatUserSecondary = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return '';
      const first = getOptionalStringProp(u, 'first_name') ?? '';
      const last = getOptionalStringProp(u, 'last_name') ?? '';
      const full = `${first} ${last}`.trim();
      const username = getOptionalStringProp(u, 'username');
      if (username && full) return `@${username}`;
      return '';
    },
    [usersById],
  );

  const initialsForUser = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return getUserInitials(userId);
      const displayName = getOptionalStringProp(u, 'displayName') ?? getOptionalStringProp(u, 'display_name');
      if (typeof displayName === 'string' && displayName.trim()) return getUserInitials(displayName.trim());
      const first = getOptionalStringProp(u, 'first_name') ?? '';
      const last = getOptionalStringProp(u, 'last_name') ?? '';
      const full = `${first} ${last}`.trim();
      const username = getOptionalStringProp(u, 'username');
      return getUserInitials(full || username || userId);
    },
    [usersById],
  );

  if (viewQuery.isLoading) {
    return <div className="p-6 text-[#b6c2cf]">Loading…</div>;
  }
  if (!viewQuery.data || !board) {
    return <div className="p-6 text-[#b6c2cf]">Board not found.</div>;
  }

  const ticketsByColumn = new Map<string, typeof tickets>();
  for (const c of columns) ticketsByColumn.set(c.id, []);
  for (const t of tickets) {
    const arr = ticketsByColumn.get(t.columnId) ?? [];
    arr.push(t);
    ticketsByColumn.set(t.columnId, arr);
  }

  const labelMap = new Map(boardLabels.map((l) => [l.id, l]));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 text-[#b6c2cf] flex items-center justify-between border-b border-[#9fadbc29]">
        <div>
          <div className="text-xl font-semibold">
            {isEditingBoardTitle ? (
              <Input
                autoFocus
                value={boardTitleDraft}
                onChange={(e) => setBoardTitleDraft(e.target.value)}
                onBlur={() => {
                  const next = boardTitleDraft.trim();
                  setIsEditingBoardTitle(false);
                  if (!next) {
                    setBoardTitleDraft(board.title);
                    return;
                  }
                  if (next !== board.title && !updateBoard.isPending) {
                    updateBoard.mutate({ boardId, title: next });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') {
                    setIsEditingBoardTitle(false);
                    setBoardTitleDraft(board.title);
                  }
                }}
                className="max-w-md"
              />
            ) : (
              <button
                type="button"
                className="hover:bg-[#a6c5e229] rounded px-2 py-1 -ml-2 transition-colors"
                onClick={() => {
                  setBoardTitleDraft(board.title);
                  setIsEditingBoardTitle(true);
                }}
              >
                {board.title}
              </button>
            )}
          </div>
          {board.description ? <div className="text-sm text-[#9fadbc] mt-1">{board.description}</div> : null}
        </div>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="trello">Add column</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
              <DialogHeader>
                <DialogTitle>Create column</DialogTitle>
              </DialogHeader>
              <Input value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} placeholder="Column title" />
              <DialogFooter>
                <Button
                  variant="trello"
                  disabled={!newColumnTitle.trim() || createColumn.isPending}
                  onClick={() => {
                    createColumn.mutate({ boardId, title: newColumnTitle.trim() });
                    setNewColumnTitle('');
                  }}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6">
        <div className="flex gap-6 min-h-full">
          {columns.map((col) => {
            const colTickets = ticketsByColumn.get(col.id) ?? [];
            const newTitle = newCardTitleByColumn[col.id] ?? '';
            const newDesc = newCardDescByColumn[col.id] ?? '';
            const isEditingThisColumn = editingColumnId === col.id;
            const isSettingsOpen = settingsColumnId === col.id;

            return (
              <div
                key={col.id}
                className="w-80 shrink-0 rounded-xl bg-[#101204] bg-opacity-20 border border-[#9fadbc29] backdrop-blur-sm flex flex-col max-h-full shadow-lg"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!draggingTicketId) return;
                  const maxPos = colTickets.reduce((m, t) => Math.max(m, t.position ?? 0), 0);
                  moveTicket.mutate({ boardId, ticketId: draggingTicketId, columnId: col.id, position: maxPos + 1 });
                  setDraggingTicketId(null);
                }}
              >
                <div className="px-3 py-3 flex items-center justify-between border-b border-[#9fadbc29]">
                  <div className="min-w-0 flex items-center gap-2">
                    {isEditingThisColumn ? (
                      <Input
                        autoFocus
                        value={columnTitleDraft}
                        onChange={(e) => setColumnTitleDraft(e.target.value)}
                        onBlur={() => {
                          const next = columnTitleDraft.trim();
                          setEditingColumnId(null);
                          if (!next) {
                            setColumnTitleDraft(col.title);
                            return;
                          }
                          if (next !== col.title && !updateColumn.isPending) {
                            updateColumn.mutate({ boardId, columnId: col.id, title: next });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') {
                            setEditingColumnId(null);
                            setColumnTitleDraft(col.title);
                          }
                        }}
                        className="h-8"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#b6c2cf] truncate text-left hover:bg-[#a6c5e229] rounded px-2 py-1 -ml-2 transition-colors"
                        onClick={() => {
                          setColumnTitleDraft(col.title);
                          setEditingColumnId(col.id);
                        }}
                      >
                        {col.title}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-[#9fadbc] font-medium">{colTickets.length}</div>

                    <Dialog
                      open={isSettingsOpen}
                      onOpenChange={(open) => {
                        if (open) {
                          setSettingsTitleDraft(col.title);
                          setSettingsColumnId(col.id);
                        } else if (settingsColumnId === col.id) {
                          setSettingsColumnId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229]">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
                        <DialogHeader>
                          <DialogTitle>Column settings</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-2">
                          <div className="text-sm text-[#9fadbc]">Title</div>
                          <Input
                            value={settingsTitleDraft}
                            onChange={(e) => setSettingsTitleDraft(e.target.value)}
                            placeholder="Column title"
                          />
                        </div>

                        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                          <Button
                            variant="destructive"
                            disabled={removeColumn.isPending}
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: 'Delete column',
                                description: 'Delete this column? Tickets in this column may be affected.',
                                onConfirm: () => {
                                  removeColumn.mutate(
                                    { boardId, columnId: col.id },
                                    {
                                      onSuccess: () => {
                                        setSettingsColumnId(null);
                                      },
                                    },
                                  );
                                },
                              });
                            }}
                          >
                            Delete column
                          </Button>

                          <Button
                            variant="trello"
                            disabled={!settingsTitleDraft.trim() || updateColumn.isPending}
                            onClick={() => {
                              const next = settingsTitleDraft.trim();
                              if (!next) return;
                              updateColumn.mutate(
                                { boardId, columnId: col.id, title: next },
                                {
                                  onSuccess: () => {
                                    setSettingsColumnId(null);
                                  },
                                },
                              );
                            }}
                          >
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-3 flex-1 overflow-y-auto space-y-3">
                  {colTickets.map((t) => {
                    const ticketLabels = t.labelIds?.map((lid) => labelMap.get(lid)).filter(Boolean) ?? [];
                    const hasChecklist = false; // TODO: query checklists count
                    const hasAttachment = false;
                    const hasComment = false;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDraggingTicketId(t.id)}
                        onDragEnd={() => setDraggingTicketId(null)}
                        onClick={() => setOpenedTicketId(t.id)}
                        className={cn(
                          'rounded-lg bg-[#282e33] border border-[#9fadbc29] p-4 text-[#b6c2cf] cursor-pointer hover:border-[#0c66e4] hover:shadow-lg transition-all group',
                          draggingTicketId === t.id && 'opacity-50',
                        )}
                      >
                        {/* Labels */}
                        {ticketLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {ticketLabels.map((label) => (
                              <div
                                key={label!.id}
                                className="h-2 w-12 rounded-full shadow-sm"
                                style={{ backgroundColor: label!.color }}
                                title={label!.name}
                              />
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <div className="text-sm font-medium leading-snug mb-2">{t.title}</div>

                        {/* Badges footer */}
                        <div className="flex items-center gap-3 mt-3">
                          {hasChecklist && (
                            <div className="flex items-center gap-1 text-xs text-[#9fadbc]">
                              <CheckSquare className="h-3 w-3" />
                              <span>0/0</span>
                            </div>
                          )}
                          {hasComment && (
                            <div className="flex items-center gap-1 text-xs text-[#9fadbc]">
                              <MessageSquare className="h-3 w-3" />
                              <span>0</span>
                            </div>
                          )}
                          {hasAttachment && (
                            <div className="flex items-center gap-1 text-xs text-[#9fadbc]">
                              <Paperclip className="h-3 w-3" />
                              <span>0</span>
                            </div>
                          )}
                          {/* Assignees */}
                          {t.assigneeIds && t.assigneeIds.length > 0 && (
                            <div className="flex -space-x-1 ml-auto">
                              {t.assigneeIds.slice(0, 3).map((aid) => (
                                <Avatar
                                  key={aid}
                                  className="h-6 w-6 border-2 border-[#282e33]"
                                  title={[formatUserPrimary(aid), formatUserSecondary(aid)].filter(Boolean).join(' ')}
                                >
                                  <AvatarFallback className="bg-[#44546f] text-white text-xs">
                                    {initialsForUser(aid)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {t.assigneeIds.length > 3 && (
                                <div className="h-6 w-6 rounded-full bg-[#44546f] border-2 border-[#282e33] flex items-center justify-center text-xs text-white">
                                  +{t.assigneeIds.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="m-3 mt-0 rounded-lg px-4 py-2.5 text-left text-sm text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#b6c2cf] transition-colors flex items-center gap-2 font-medium"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add a card
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
                    <DialogHeader>
                      <DialogTitle>Add card</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewCardTitleByColumn((s) => ({ ...s, [col.id]: e.target.value }))}
                        placeholder="Card title"
                      />
                      <Textarea
                        value={newDesc}
                        onChange={(e) => setNewCardDescByColumn((s) => ({ ...s, [col.id]: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="trello"
                        disabled={!newTitle.trim() || createTicket.isPending}
                        onClick={() => {
                          createTicket.mutate({ boardId, columnId: col.id, title: newTitle.trim(), description: newDesc });
                          setNewCardTitleByColumn((s) => ({ ...s, [col.id]: '' }));
                          setNewCardDescByColumn((s) => ({ ...s, [col.id]: '' }));
                        }}
                      >
                        Add
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket detail dialog */}
      {openedTicketId && (
        <TicketDialogV2
          open={Boolean(openedTicketId)}
          onOpenChange={(open) => {
            if (!open) setOpenedTicketId(null);
          }}
          ticketId={openedTicketId}
          boardId={boardId}
        />
      )}

      {/* Custom Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="destructive"
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
