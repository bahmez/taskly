'use client';

import React from 'react';
import { api } from '@/app/trpc';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Textarea, cn } from '@taskly/ui';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';

export default function BoardClient({ boardId }: { boardId: string }) {
  const utils = api.useUtils();
  const { setSelectedWorkspaceId } = useWorkspaceUI();

  const viewQuery = api.boards.view.useQuery({ boardId });

  React.useEffect(() => {
    if (viewQuery.data?.board?.workspaceId) {
      setSelectedWorkspaceId(viewQuery.data.board.workspaceId);
    }
  }, [viewQuery.data?.board?.workspaceId, setSelectedWorkspaceId]);

  const createColumn = api.boards.columns.create.useMutation({
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
          <div className="text-xl font-semibold">{board.title}</div>
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
                  <div className="text-sm font-semibold text-[#b6c2cf] truncate">{col.title}</div>
                  <div className="text-xs text-[#9fadbc]">{colTickets.length}</div>
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


