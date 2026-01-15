'use client';

import React from 'react';
import { api } from '@/app/trpc';
import type { BoardBackground } from '@taskly/trpc';
import { getBoardBackgroundStyle } from '@/components/board/board-background';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { MoreHorizontal, Plus, CheckSquare, Paperclip, MessageSquare, GripVertical, Calendar, ScrollText, Clock, Paintbrush } from 'lucide-react';
import TicketDialogV2 from '@/components/ticket/ticket-dialog-v2';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

type DndItemType = 'column' | 'ticket' | 'column-drop';

function dndColumnId(columnId: string): string {
  return `column:${columnId}`;
}
function dndColumnDropId(columnId: string): string {
  return `column-drop:${columnId}`;
}
function dndTicketId(ticketId: string): string {
  return `ticket:${ticketId}`;
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

function formatBoardActivityType(input: { type: string; ticketTitle?: string | null }): string {
  switch (input.type) {
    case 'board_created':
      return 'Board created';
    case 'board_updated':
      return 'Board updated';
    case 'board_archived':
      return 'Board archived';
    case 'board_column_created':
      return 'Column created';
    case 'board_column_updated':
      return 'Column updated';
    case 'board_column_deleted':
      return 'Column deleted';
    case 'board_columns_reordered':
      return 'Columns reordered';
    case 'board_label_created':
      return 'Label created';
    case 'board_label_updated':
      return 'Label updated';
    case 'board_label_deleted':
      return 'Label deleted';
    case 'board_labels_reordered':
      return 'Labels reordered';
    case 'ticket_created':
      return `Ticket created${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_updated':
      return `Ticket updated${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_moved':
      return `Ticket moved${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_archived':
      return `Ticket archived${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_comment_added':
      return `Comment added${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_comment_updated':
      return `Comment updated${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_comment_deleted':
      return `Comment deleted${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_assignee_added':
      return `Assignee added${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_assignee_removed':
      return `Assignee removed${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_label_added':
      return `Label added${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_label_removed':
      return `Label removed${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_created':
      return `Checklist created${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_updated':
      return `Checklist updated${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_deleted':
      return `Checklist deleted${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_item_added':
      return `Checklist item added${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_item_updated':
      return `Checklist item updated${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_checklist_item_deleted':
      return `Checklist item deleted${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_attachment_upload_created':
      return `Attachment upload started${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_attachment_uploaded':
      return `Attachment uploaded${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    case 'ticket_attachment_removed':
      return `Attachment removed${input.ticketTitle ? `: ${input.ticketTitle}` : ''}`;
    default:
      return input.type;
  }
}

function boardBackgroundKey(bg: BoardBackground): string {
  if (bg.type === 'image') return `image:${bg.value.id}`;
  return `${bg.type}:${bg.value}`;
}

function isSameBackground(a: BoardBackground, b: BoardBackground | null): boolean {
  if (!b || a.type !== b.type) return false;
  if (a.type === 'image' && b.type === 'image') return a.value.id === b.value.id;
  return a.value === b.value;
}

type AnyLabel = { id: string; name: string; color: string };
type TicketLike = {
  id: string;
  columnId: string;
  title: string;
  position?: number;
  dueDate?: string | null;
  assigneeIds?: string[];
  labelIds?: string[];
};
type ColumnLike = { id: string; title: string };
type MutationLike<TInput> = { mutate: (input: TInput, opts?: unknown) => void; isPending: boolean };

function SortableBoardTicket({
  t,
  labelMap,
  onOpen,
  formatUserPrimary,
  formatUserSecondary,
  initialsForUser,
}: {
  t: TicketLike;
  labelMap: Map<string, AnyLabel>;
  onOpen: (ticketId: string) => void;
  formatUserPrimary: (userId: string) => string;
  formatUserSecondary: (userId: string) => string;
  initialsForUser: (userId: string) => string;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: dndTicketId(t.id),
    data: { type: 'ticket' satisfies DndItemType, ticketId: t.id, columnId: t.columnId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ticketLabels = t.labelIds?.map((lid) => labelMap.get(lid)).filter(Boolean) ?? [];
  const hasChecklist = false; // TODO: query checklists count
  const hasAttachment = false;
  const hasComment = false;
  const dueDateLabel = React.useMemo(() => {
    if (!t.dueDate) return null;
    const d = new Date(t.dueDate);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toLocaleDateString();
  }, [t.dueDate]);
  const isOverdue = React.useMemo(() => {
    if (!t.dueDate) return false;
    const ms = Date.parse(t.dueDate);
    if (!Number.isFinite(ms)) return false;
    return ms < Date.now();
  }, [t.dueDate]);

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-60')}>
      <div
        onClick={() => {
          if (!isDragging) onOpen(t.id);
        }}
        className="relative rounded-lg bg-[#282e33] border border-[#9fadbc29] p-4 text-[#b6c2cf] cursor-pointer hover:border-[#0c66e4] hover:shadow-lg transition-all group"
      >
        <button
          type="button"
          aria-label="Drag ticket"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={cn(
            'absolute right-2 top-2 z-10 rounded p-1 text-[#9fadbc] hover:bg-[#a6c5e229]',
            // no hover on mobile; keep it visible
            'opacity-100 md:opacity-0 md:group-hover:opacity-100',
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="h-4 w-4" />
        </button>

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
          {dueDateLabel && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs rounded px-2 py-1 border',
                isOverdue
                  ? 'text-red-200 border-red-500/40 bg-red-500/10'
                  : 'text-[#9fadbc] border-[#9fadbc29] bg-[#1d2125]',
              )}
              title={t.dueDate ? new Date(t.dueDate).toLocaleString() : undefined}
            >
              <Calendar className="h-3 w-3" />
              <span>{dueDateLabel}</span>
            </div>
          )}
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
                  <AvatarFallback className="bg-[#44546f] text-white text-xs">{initialsForUser(aid)}</AvatarFallback>
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
    </div>
  );
}

function SortableBoardColumn({
  boardId,
  col,
  colTickets,
  isEditingThisColumn,
  columnTitleDraft,
  setColumnTitleDraft,
  onBeginEdit,
  onCommitEdit,
  onCancelEdit,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  settingsTitleDraft,
  setSettingsTitleDraft,
  onRequestDelete,
  onSaveSettingsTitle,
  updateColumn,
  removeColumn,
  createTicket,
  newTitle,
  newDesc,
  onChangeNewTitle,
  onChangeNewDesc,
  onAddCard,
  labelMap,
  onOpenTicket,
  formatUserPrimary,
  formatUserSecondary,
  initialsForUser,
}: {
  boardId: string;
  col: ColumnLike;
  colTickets: TicketLike[];
  isEditingThisColumn: boolean;
  columnTitleDraft: string;
  setColumnTitleDraft: (v: string) => void;
  onBeginEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  settingsTitleDraft: string;
  setSettingsTitleDraft: (v: string) => void;
  onRequestDelete: () => void;
  onSaveSettingsTitle: () => void;
  updateColumn: MutationLike<{ boardId: string; columnId: string; title: string }>;
  removeColumn: MutationLike<{ boardId: string; columnId: string }>;
  createTicket: MutationLike<{ boardId: string; columnId: string; title: string; description: string }>;
  newTitle: string;
  newDesc: string;
  onChangeNewTitle: (v: string) => void;
  onChangeNewDesc: (v: string) => void;
  onAddCard: () => void;
  labelMap: Map<string, AnyLabel>;
  onOpenTicket: (ticketId: string) => void;
  formatUserPrimary: (userId: string) => string;
  formatUserSecondary: (userId: string) => string;
  initialsForUser: (userId: string) => string;
}) {
  const { setNodeRef: setDropRef } = useDroppable({
    id: dndColumnDropId(col.id),
    data: { type: 'column-drop' satisfies DndItemType, columnId: col.id },
  });

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: dndColumnId(col.id),
    data: { type: 'column' satisfies DndItemType, columnId: col.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-80 shrink-0 rounded-xl bg-[#101204] bg-opacity-20 border border-[#9fadbc29] backdrop-blur-sm flex flex-col max-h-full shadow-lg',
        isDragging && 'opacity-70',
      )}
    >
      <div className="px-3 py-3 flex items-center justify-between border-b border-[#9fadbc29]">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            aria-label="Drag column"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="h-7 w-7 grid place-items-center rounded text-[#9fadbc] hover:bg-[#a6c5e229]"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {isEditingThisColumn ? (
            <Input
              autoFocus
              value={columnTitleDraft}
              onChange={(e) => setColumnTitleDraft(e.target.value)}
              onBlur={() => {
                onCommitEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="h-8"
            />
          ) : (
            <button
              type="button"
              className="text-sm font-semibold text-[#b6c2cf] truncate text-left hover:bg-[#a6c5e229] rounded px-2 py-1 -ml-2 transition-colors"
              onClick={onBeginEdit}
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
              if (open) onOpenSettings();
              else onCloseSettings();
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
                <Input value={settingsTitleDraft} onChange={(e) => setSettingsTitleDraft(e.target.value)} placeholder="Column title" />
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                <Button variant="destructive" disabled={removeColumn.isPending} onClick={onRequestDelete}>
                  Delete column
                </Button>

                <Button variant="trello" disabled={!settingsTitleDraft.trim() || updateColumn.isPending} onClick={onSaveSettingsTitle}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div ref={setDropRef} className="px-3 pb-3 pt-3 flex-1 overflow-y-auto space-y-3 min-h-6">
        <SortableContext items={colTickets.map((t) => dndTicketId(t.id))} strategy={verticalListSortingStrategy}>
          {colTickets.map((t) => (
            <SortableBoardTicket
              key={t.id}
              t={t}
              labelMap={labelMap}
              onOpen={onOpenTicket}
              formatUserPrimary={formatUserPrimary}
              formatUserSecondary={formatUserSecondary}
              initialsForUser={initialsForUser}
            />
          ))}
        </SortableContext>
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
            <Input value={newTitle} onChange={(e) => onChangeNewTitle(e.target.value)} placeholder="Card title" />
            <Textarea value={newDesc} onChange={(e) => onChangeNewDesc(e.target.value)} placeholder="Description (optional)" />
          </div>
          <DialogFooter>
            <Button variant="trello" disabled={!newTitle.trim() || createTicket.isPending} onClick={onAddCard}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BoardClient({ boardId }: { boardId: string }) {
  const utils = api.useUtils();
  const { setSelectedWorkspaceId } = useWorkspaceUI();
  const { toast } = useToast();

  const viewQuery = api.boards.view.useQuery({ boardId });
  const labelsQuery = api.boards.labels.list.useQuery({ boardId });
  const [boardActivityOpen, setBoardActivityOpen] = React.useState(false);
  const boardActivityQuery = api.boards.activity.list.useQuery(
    { boardId, limit: 30, cursor: null, includeTickets: true },
    { enabled: boardActivityOpen },
  );

  const [backgroundPickerOpen, setBackgroundPickerOpen] = React.useState(false);
  const [backgroundTab, setBackgroundTab] = React.useState<'color' | 'gradient' | 'image'>('color');
  const [imageSearch, setImageSearch] = React.useState('');
  const imageSearchValue = imageSearch.trim();

  const backgroundsQuery = api.boards.listBackgrounds.useInfiniteQuery(
    {
      type: backgroundTab,
      limit: 12,
      query: backgroundTab === 'image' && imageSearchValue ? imageSearchValue : undefined,
    },
    {
      enabled: backgroundPickerOpen,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

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

  const reorderColumns = api.boards.columns.reorder.useMutation({
    onSuccess: async () => {
      await utils.boards.view.invalidate({ boardId });
    },
    onError: (e) => toast({ title: 'Cannot reorder columns', description: trpcErrorMessage(e), variant: 'destructive' }),
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
  const canEditBackground = viewQuery.data?.permissions?.canBackgroundWrite ?? false;
  const serverColumns = React.useMemo(() => viewQuery.data?.columns ?? [], [viewQuery.data?.columns]);
  const serverTickets = React.useMemo(() => viewQuery.data?.tickets ?? [], [viewQuery.data?.tickets]);
  const boardLabels = labelsQuery.data ?? [];

  const [columnsState, setColumnsState] = React.useState(serverColumns);
  const [ticketsState, setTicketsState] = React.useState(serverTickets);

  React.useEffect(() => {
    setColumnsState(serverColumns);
    setTicketsState(serverTickets);
  }, [serverColumns, serverTickets]);

  const allAssigneeIds = React.useMemo<string[]>(() => {
    const ids = ticketsState.flatMap((t) => t.assigneeIds ?? []);
    return Array.from(new Set(ids));
  }, [ticketsState]);

  const assigneeUsersQuery = api.users.byIds.useQuery(
    { ids: allAssigneeIds },
    { enabled: allAssigneeIds.length > 0, staleTime: 60_000 },
  );

  const usersById = React.useMemo(() => {
    return new Map((assigneeUsersQuery.data ?? []).map((u) => [u.id, u]));
  }, [assigneeUsersQuery.data]);

  const boardActivityItems = boardActivityQuery.data?.items ?? [];
  const activityActorIds = React.useMemo(() => {
    const ids = boardActivityItems.map((i) => i.actorId).filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [boardActivityItems]);
  const activityActorsQuery = api.users.byIds.useQuery({ ids: activityActorIds }, { enabled: boardActivityOpen && activityActorIds.length > 0 });

  const activityUsersById = React.useMemo(() => {
    const all = [...(assigneeUsersQuery.data ?? []), ...(activityActorsQuery.data ?? [])];
    return new Map(all.map((u) => [u.id, u]));
  }, [assigneeUsersQuery.data, activityActorsQuery.data]);

  const formatActor = React.useCallback(
    (userId: string | null): string => {
      if (!userId) return 'Système';
      const u = activityUsersById.get(userId);
      if (!u) return userId;
      const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      if (full) return full;
      if (u.username) return u.username;
      return userId;
    },
    [activityUsersById],
  );

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

  const ticketsByColumn = React.useMemo(() => {
    const m = new Map<string, typeof ticketsState>();
    for (const c of columnsState) m.set(c.id, []);
    for (const t of ticketsState) {
      const arr = m.get(t.columnId) ?? [];
      arr.push(t);
      m.set(t.columnId, arr);
    }
    for (const [cid, arr] of m.entries()) {
      m.set(
        cid,
        arr.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      );
    }
    return m;
  }, [columnsState, ticketsState]);

  const labelMap = React.useMemo(() => new Map(boardLabels.map((l) => [l.id, l])) as Map<string, AnyLabel>, [boardLabels]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

  const [activeDrag, setActiveDrag] = React.useState<
    | { type: 'column'; columnId: string }
    | { type: 'ticket'; ticketId: string }
    | null
  >(null);

  const onDragStart = React.useCallback((event: DragStartEvent) => {
    const type = event.active.data.current?.type as DndItemType | undefined;
    if (type === 'column') {
      const columnId = event.active.data.current?.columnId as string | undefined;
      if (columnId) setActiveDrag({ type: 'column', columnId });
      return;
    }
    if (type === 'ticket') {
      const ticketId = event.active.data.current?.ticketId as string | undefined;
      if (ticketId) setActiveDrag({ type: 'ticket', ticketId });
    }
  }, []);

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeType = active.data.current?.type as DndItemType | undefined;
      const overType = over?.data.current?.type as DndItemType | undefined;

      try {
        if (!over) return;

        if (activeType === 'column' && overType === 'column') {
          const activeColumnId = active.data.current?.columnId as string | undefined;
          const overColumnId = over.data.current?.columnId as string | undefined;
          if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return;

          const oldIndex = columnsState.findIndex((c) => c.id === activeColumnId);
          const newIndex = columnsState.findIndex((c) => c.id === overColumnId);
          if (oldIndex < 0 || newIndex < 0) return;

          const next = arrayMove(columnsState, oldIndex, newIndex);
          setColumnsState(next);
          reorderColumns.mutate({ boardId, columnIds: next.map((c) => c.id) });
          return;
        }

        if (activeType === 'ticket') {
          const ticketId = active.data.current?.ticketId as string | undefined;
          const fromColumnId = active.data.current?.columnId as string | undefined;
          if (!ticketId || !fromColumnId) return;

          let toColumnId: string | null = null;
          let insertIndex: number | null = null; // 0-based

          if (overType === 'ticket') {
            const overTicketId = over.data.current?.ticketId as string | undefined;
            toColumnId = (over.data.current?.columnId as string | undefined) ?? null;
            if (!overTicketId || !toColumnId) return;

            const destIds = (ticketsByColumn.get(toColumnId) ?? []).map((t) => t.id).filter((id) => id !== ticketId);
            const overIndex = destIds.indexOf(overTicketId);
            insertIndex = overIndex >= 0 ? overIndex : destIds.length;
          } else if (overType === 'column-drop' || overType === 'column') {
            toColumnId = (over.data.current?.columnId as string | undefined) ?? null;
            if (!toColumnId) return;
            const destIds = (ticketsByColumn.get(toColumnId) ?? []).map((t) => t.id).filter((id) => id !== ticketId);
            insertIndex = destIds.length;
          } else {
            return;
          }

          if (!toColumnId || insertIndex === null) return;

          // Optimistic local reorder (keeps UI stable during refetch)
          setTicketsState((prev) => {
            const fromIds = prev
              .filter((t) => t.columnId === fromColumnId && t.id !== ticketId)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((t) => t.id);

            const baseToIds =
              fromColumnId === toColumnId
                ? fromIds
                : prev
                    .filter((t) => t.columnId === toColumnId && t.id !== ticketId)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((t) => t.id);

            const toIds = baseToIds.slice();
            const clampedIndex = Math.min(Math.max(insertIndex, 0), toIds.length);
            toIds.splice(clampedIndex, 0, ticketId);

            const patches = new Map<string, { columnId: string; position: number }>();
            if (fromColumnId !== toColumnId) {
              for (let i = 0; i < fromIds.length; i++) patches.set(fromIds[i]!, { columnId: fromColumnId, position: i + 1 });
            }
            for (let i = 0; i < toIds.length; i++) patches.set(toIds[i]!, { columnId: toColumnId, position: i + 1 });

            return prev.map((t) => {
              const p = patches.get(t.id);
              return p ? { ...t, columnId: p.columnId, position: p.position } : t;
            });
          });

          moveTicket.mutate({ boardId, ticketId, columnId: toColumnId, position: insertIndex + 1 });
        }
      } finally {
        setActiveDrag(null);
      }
    },
    [boardId, columnsState, moveTicket, reorderColumns, ticketsByColumn],
  );

  const openDeleteColumnConfirm = React.useCallback(
    (columnId: string) => {
      setConfirmDialog({
        open: true,
        title: 'Delete column',
        description: 'Delete this column? Tickets in this column may be affected.',
        onConfirm: () => {
          removeColumn.mutate(
            { boardId, columnId },
            {
              onSuccess: () => {
                setSettingsColumnId(null);
              },
            },
          );
        },
      });
    },
    [boardId, removeColumn],
  );

  // IMPORTANT: keep conditional returns AFTER all hooks to avoid "Rendered more hooks than during the previous render"
  if (viewQuery.isLoading) {
    return <div className="p-6 text-[#b6c2cf]">Loading…</div>;
  }
  if (!viewQuery.data || !board) {
    return <div className="p-6 text-[#b6c2cf]">Board not found.</div>;
  }

  const currentBackground = board.background ?? null;
  const backgroundItems = backgroundsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="h-full flex flex-col" style={getBoardBackgroundStyle(board.background, { fallback: '#0b0f13' })}>
      <div className="px-6 pt-5 pb-3 text-[#b6c2cf] flex items-center justify-between border-b border-[#9fadbc29] bg-[#0b0f13]/70 backdrop-blur-sm">
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
          <Dialog open={backgroundPickerOpen} onOpenChange={setBackgroundPickerOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="gap-2" disabled={!canEditBackground}>
                <Paintbrush className="h-4 w-4" />
                Background
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Board background</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                {(['color', 'gradient', 'image'] as const).map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    variant="ghost"
                    className={cn(
                      'text-sm capitalize',
                      backgroundTab === tab && 'bg-[#a6c5e229] text-white',
                    )}
                    onClick={() => setBackgroundTab(tab)}
                  >
                    {tab === 'image' ? 'Images' : tab === 'gradient' ? 'Gradients' : 'Colors'}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto text-sm text-[#9fadbc] hover:text-white"
                  onClick={() => {
                    updateBoard.mutate({ boardId, background: null });
                    setBackgroundPickerOpen(false);
                  }}
                  disabled={updateBoard.isPending}
                >
                  Remove
                </Button>
              </div>

              {backgroundTab === 'image' && (
                <Input
                  value={imageSearch}
                  onChange={(e) => setImageSearch(e.target.value)}
                  placeholder="Search Unsplash"
                />
              )}

              {backgroundsQuery.isLoading ? (
                <div className="text-sm text-[#9fadbc]">Loading backgrounds…</div>
              ) : backgroundItems.length === 0 ? (
                <div className="text-sm text-[#9fadbc]">No background found.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {backgroundItems.map((bg) => {
                    const selected = isSameBackground(bg, currentBackground);
                    return (
                      <button
                        key={boardBackgroundKey(bg)}
                        type="button"
                        className={cn(
                          'h-16 rounded-md border border-[#9fadbc29] overflow-hidden focus:outline-none',
                          selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#1d2125]',
                        )}
                        style={getBoardBackgroundStyle(bg, { preferThumb: true })}
                        onClick={() => {
                          updateBoard.mutate({ boardId, background: bg });
                          setBackgroundPickerOpen(false);
                        }}
                        disabled={updateBoard.isPending}
                        title={bg.type === 'image' ? bg.value.authorName ?? 'Unsplash' : bg.value}
                      />
                    );
                  })}
                </div>
              )}

              {backgroundsQuery.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-[#9fadbc] hover:text-white"
                    onClick={() => backgroundsQuery.fetchNextPage()}
                    disabled={backgroundsQuery.isFetchingNextPage}
                  >
                    {backgroundsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={boardActivityOpen} onOpenChange={setBoardActivityOpen}>
            <Button variant="ghost" className="gap-2" onClick={() => setBoardActivityOpen(true)}>
              <ScrollText className="h-4 w-4" />
              Activity
            </Button>
            <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-2xl">
              <DialogHeader>
                <DialogTitle>Board activity</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {boardActivityItems.length === 0 ? (
                  <div className="text-sm text-[#9fadbc]">No activity yet.</div>
                ) : (
                  boardActivityItems.map((it) => {
                    const ticketTitle = it.ticketId ? ticketsState.find((t) => t.id === it.ticketId)?.title ?? null : null;
                    return (
                      <div key={it.id} className="flex items-start gap-3 bg-[#282e33] border border-[#9fadbc29] rounded-lg p-3">
                        <div className="h-9 w-9 shrink-0 rounded bg-[#1d2125] border border-[#9fadbc29] flex items-center justify-center">
                          <Clock className="h-4 w-4 text-[#9fadbc]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">
                            {formatBoardActivityType({ type: it.type, ticketTitle })}
                          </div>
                          <div className="text-xs text-[#9fadbc] mt-1">
                            {formatActor(it.actorId)} • {new Date(it.createdAt).toLocaleString()}
                            {it.ticketId ? (
                              <>
                                {' '}
                                •{' '}
                                <button
                                  type="button"
                                  className="underline hover:text-[#b6c2cf]"
                                  onClick={() => {
                                    setBoardActivityOpen(false);
                                    setOpenedTicketId(it.ticketId!);
                                  }}
                                >
                                  Open ticket
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

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
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={columnsState.map((c) => dndColumnId(c.id))} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-6 min-h-full">
              {columnsState.map((col) => {
                const colTickets = ticketsByColumn.get(col.id) ?? [];
                const newTitle = newCardTitleByColumn[col.id] ?? '';
                const newDesc = newCardDescByColumn[col.id] ?? '';
                const isEditingThisColumn = editingColumnId === col.id;
                const isSettingsOpen = settingsColumnId === col.id;

                return (
                  <SortableBoardColumn
                    key={col.id}
                    boardId={boardId}
                    col={col as unknown as ColumnLike}
                    colTickets={colTickets as unknown as TicketLike[]}
                    isEditingThisColumn={isEditingThisColumn}
                    columnTitleDraft={columnTitleDraft}
                    setColumnTitleDraft={setColumnTitleDraft}
                    onBeginEdit={() => {
                      setColumnTitleDraft(col.title);
                      setEditingColumnId(col.id);
                    }}
                    onCommitEdit={() => {
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
                    onCancelEdit={() => {
                      setEditingColumnId(null);
                      setColumnTitleDraft(col.title);
                    }}
                    isSettingsOpen={isSettingsOpen}
                    onOpenSettings={() => {
                      setSettingsTitleDraft(col.title);
                      setSettingsColumnId(col.id);
                    }}
                    onCloseSettings={() => {
                      if (settingsColumnId === col.id) setSettingsColumnId(null);
                    }}
                    settingsTitleDraft={settingsTitleDraft}
                    setSettingsTitleDraft={setSettingsTitleDraft}
                    onRequestDelete={() => openDeleteColumnConfirm(col.id)}
                    onSaveSettingsTitle={() => {
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
                    updateColumn={updateColumn as unknown as MutationLike<{ boardId: string; columnId: string; title: string }>}
                    removeColumn={removeColumn as unknown as MutationLike<{ boardId: string; columnId: string }>}
                    createTicket={createTicket as unknown as MutationLike<{ boardId: string; columnId: string; title: string; description: string }>}
                    newTitle={newTitle}
                    newDesc={newDesc}
                    onChangeNewTitle={(v) => setNewCardTitleByColumn((s) => ({ ...s, [col.id]: v }))}
                    onChangeNewDesc={(v) => setNewCardDescByColumn((s) => ({ ...s, [col.id]: v }))}
                    onAddCard={() => {
                      createTicket.mutate({ boardId, columnId: col.id, title: newTitle.trim(), description: newDesc });
                      setNewCardTitleByColumn((s) => ({ ...s, [col.id]: '' }));
                      setNewCardDescByColumn((s) => ({ ...s, [col.id]: '' }));
                    }}
                    labelMap={labelMap}
                    onOpenTicket={(ticketId) => setOpenedTicketId(ticketId)}
                    formatUserPrimary={formatUserPrimary}
                    formatUserSecondary={formatUserSecondary}
                    initialsForUser={initialsForUser}
                  />
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeDrag?.type === 'column' ? (
              <div className="w-80 rounded-xl bg-[#101204] bg-opacity-30 border border-[#9fadbc29] backdrop-blur-sm shadow-lg px-4 py-3 text-[#b6c2cf] font-semibold">
                {columnsState.find((c) => c.id === activeDrag.columnId)?.title ?? 'Column'}
              </div>
            ) : activeDrag?.type === 'ticket' ? (
              <div className="w-80 rounded-lg bg-[#282e33] border border-[#9fadbc29] p-4 text-[#b6c2cf] shadow-lg">
                {ticketsState.find((t) => t.id === activeDrag.ticketId)?.title ?? 'Ticket'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
