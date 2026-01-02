'use client';

import React from 'react';
import { api } from '@/app/trpc';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Textarea, cn } from '@taskly/ui';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import { MoreHorizontal } from 'lucide-react';

export default function BoardClient({ boardId }: { boardId: string }) {
  const utils = api.useUtils();
  const { setSelectedWorkspaceId } = useWorkspaceUI();

  const viewQuery = api.boards.view.useQuery({ boardId });

  React.useEffect(() => {
    if (viewQuery.data?.board?.workspaceId) {
      setSelectedWorkspaceId(viewQuery.data.board.workspaceId);
    }
  }, [viewQuery.data?.board?.workspaceId, setSelectedWorkspaceId]);

  const updateBoard = api.boards.update.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
  });

  const createColumn = api.boards.columns.create.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
  });

  const updateColumn = api.boards.columns.update.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
  });

  const removeColumn = api.boards.columns.remove.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
  });

  const createTicket = api.boards.tickets.create.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
  });

  const moveTicket = api.boards.tickets.move.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
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

  if (viewQuery.isLoading) {
    return <div className="p-6 text-[#b6c2cf]">Loading…</div>;
  }
  if (!viewQuery.data) {
    return <div className="p-6 text-[#b6c2cf]">Board not found.</div>;
  }

  const { board, columns, tickets } = viewQuery.data;

  const ticketsByColumn = new Map<string, typeof tickets>();
  for (const c of columns) ticketsByColumn.set(c.id, []);
  for (const t of tickets) {
    const arr = ticketsByColumn.get(t.columnId) ?? [];
    arr.push(t);
    ticketsByColumn.set(t.columnId, arr);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 text-[#b6c2cf] flex items-center justify-between">
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

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="trelloGray">Add column</Button>
          </DialogTrigger>
          <DialogContent>
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
        <div className="flex gap-4 min-h-full">
          {columns.map((col) => {
            const colTickets = ticketsByColumn.get(col.id) ?? [];
            const newTitle = newCardTitleByColumn[col.id] ?? '';
            const newDesc = newCardDescByColumn[col.id] ?? '';
            const isEditingThisColumn = editingColumnId === col.id;
            const isSettingsOpen = settingsColumnId === col.id;

            return (
              <div
                key={col.id}
                className="w-72 shrink-0 rounded-xl bg-[#101204] bg-opacity-20 border border-[#9fadbc29] backdrop-blur-sm flex flex-col max-h-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!draggingTicketId) return;
                  const maxPos = colTickets.reduce((m, t) => Math.max(m, t.position ?? 0), 0);
                  moveTicket.mutate({ boardId, ticketId: draggingTicketId, columnId: col.id, position: maxPos + 1 });
                  setDraggingTicketId(null);
                }}
              >
                <div className="px-3 py-3 flex items-center justify-between">
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
                    <div className="text-xs text-[#9fadbc]">{colTickets.length}</div>

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
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Paramètres de la colonne</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-2">
                          <div className="text-sm text-[#9fadbc]">Titre</div>
                          <Input
                            value={settingsTitleDraft}
                            onChange={(e) => setSettingsTitleDraft(e.target.value)}
                            placeholder="Titre de la colonne"
                          />
                        </div>

                        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                          <Button
                            variant="destructive"
                            disabled={removeColumn.isPending}
                            onClick={() => {
                              const ok = window.confirm(
                                'Supprimer cette colonne ? Les tickets dans cette colonne seront affectés.',
                              );
                              if (!ok) return;
                              removeColumn.mutate(
                                { boardId, columnId: col.id },
                                {
                                  onSuccess: () => {
                                    setSettingsColumnId(null);
                                  },
                                },
                              );
                            }}
                          >
                            Supprimer la colonne
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
                            Enregistrer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="px-2 pb-2 flex-1 overflow-y-auto space-y-2">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDraggingTicketId(t.id)}
                      onDragEnd={() => setDraggingTicketId(null)}
                      className={cn(
                        "rounded-lg bg-[#1d2125] border border-[#9fadbc29] p-2 text-[#b6c2cf] cursor-grab active:cursor-grabbing",
                        draggingTicketId === t.id && "opacity-70",
                      )}
                    >
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      {t.description ? <div className="text-xs text-[#9fadbc] mt-1 line-clamp-2">{t.description}</div> : null}
                    </div>
                  ))}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="m-2 mt-0 rounded-lg px-3 py-2 text-left text-sm text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#b6c2cf] transition-colors"
                      type="button"
                    >
                      + Add a card
                    </button>
                  </DialogTrigger>
                  <DialogContent>
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
    </div>
  );
}


