'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/app/trpc';
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Textarea,
  Avatar,
  AvatarFallback,
  Separator,
  useToast,
  cn,
} from '@taskly/ui';
import {
  X,
  User,
  Tag,
  Paperclip,
  CheckSquare,
  MessageSquare,
  Download,
  Trash2,
  Plus,
  Edit3,
  Eye,
  FileText,
} from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { PromptDialog } from '../ui/prompt-dialog';
import { MemberSelectDialog } from '../ui/member-select-dialog';
import { LabelManagerDialog } from '../ui/label-manager-dialog';

// MDEditor chargé dynamiquement (client-side only)
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  boardId: string;
}

function getUserInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function LabelChip({ name, color, onRemove }: { name: string; color: string; onRemove?: () => void }) {
  return (
    <div className="relative group">
      <div
        className="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold text-white shadow-sm"
        style={{ backgroundColor: color || '#94a3b8' }}
      >
        {name}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      )}
    </div>
  );
}

export default function TicketDialogV2({ open, onOpenChange, ticketId, boardId }: TicketDialogProps) {
  const { toast } = useToast();
  const utils = api.useUtils();

  // Queries
  const ticketQuery = api.tickets.get.useQuery({ ticketId }, { enabled: open });
  const commentsQuery = api.tickets.comments.list.useQuery({ ticketId }, { enabled: open });
  const checklistsQuery = api.tickets.checklists.list.useQuery({ ticketId }, { enabled: open });
  const attachmentsQuery = api.tickets.attachments.list.useQuery({ ticketId }, { enabled: open });
  const assigneesQuery = api.tickets.assignees.list.useQuery({ ticketId }, { enabled: open });
  const labelsQuery = api.tickets.labels.list.useQuery({ ticketId }, { enabled: open });
  const boardLabelsQuery = api.boards.labels.list.useQuery({ boardId }, { enabled: open });

  const ticket = ticketQuery.data;
  const permissions = ticket?.permissions;

  const commentAuthorIds = React.useMemo(() => {
    const ids = (commentsQuery.data ?? []).map((c) => c.authorId).filter(Boolean);
    return Array.from(new Set(ids));
  }, [commentsQuery.data]);

  const commentAuthorsQuery = api.users.byIds.useQuery(
    { ids: commentAuthorIds },
    { enabled: open && commentAuthorIds.length > 0 },
  );

  // Assignees details
  const assigneeIds = assigneesQuery.data?.assigneeIds ?? [];
  const assigneesDetailsQuery = api.users.byIds.useQuery(
    { ids: assigneeIds },
    { enabled: open && assigneeIds.length > 0 }
  );

  // Get board info to fetch workspace members
  const boardQuery = api.boards.view.useQuery({ boardId }, { enabled: open });
  const workspaceId = boardQuery.data?.board?.workspaceId;
  const workspaceMembersQuery = api.workspaces.members.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: open && Boolean(workspaceId) }
  );

  const workspaceMemberIds = React.useMemo(
    () => workspaceMembersQuery.data?.map((m) => m.userId) ?? [],
    [workspaceMembersQuery.data]
  );

  const workspaceMembersDetailsQuery = api.users.byIds.useQuery(
    { ids: workspaceMemberIds },
    { enabled: open && workspaceMemberIds.length > 0 }
  );

  const usersById = React.useMemo(() => {
    const all = [
      ...(assigneesDetailsQuery.data ?? []),
      ...(commentAuthorsQuery.data ?? []),
      ...(workspaceMembersDetailsQuery.data ?? []),
    ];
    return new Map(all.map((u) => [u.id, u]));
  }, [assigneesDetailsQuery.data, commentAuthorsQuery.data, workspaceMembersDetailsQuery.data]);

  const formatUserPrimary = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return userId;
      const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      if (full) return full;
      if (u.username) return u.username;
      return userId;
    },
    [usersById],
  );

  const formatUserSecondary = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return '';
      const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      if (u.username && full) return `@${u.username}`;
      return '';
    },
    [usersById],
  );

  const initialsForUser = React.useCallback(
    (userId: string): string => {
      const u = usersById.get(userId);
      if (!u) return getUserInitials(userId);
      const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      return getUserInitials(full || u.username || userId);
    },
    [usersById],
  );

  // Mutations
  const updateTicket = api.tickets.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: 'Ticket updated' });
    },
    onError: (e) => {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    },
  });

  const addComment = api.tickets.comments.add.useMutation({
    onSuccess: async () => {
      await utils.tickets.comments.list.invalidate({ ticketId });
      setNewComment('');
      toast({ title: 'Comment added' });
    },
  });

  const addAssignee = api.tickets.assignees.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.assignees.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
      ]);
      toast({ title: 'Member added' });
    },
    onError: (e) => {
      toast({ title: 'Failed to add member', description: (e as Error).message, variant: 'destructive' });
    },
  });

  const removeAssignee = api.tickets.assignees.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.assignees.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
      ]);
      toast({ title: 'Member removed' });
    },
  });

  const addLabel = api.tickets.labels.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.labels.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: 'Label added' });
    },
  });

  const removeLabel = api.tickets.labels.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.labels.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: 'Label removed' });
    },
  });

  const createBoardLabel = api.boards.labels.create.useMutation({
    onSuccess: async (newLabel) => {
      await utils.boards.labels.list.invalidate({ boardId });
      // auto-attach to ticket after creation
      addLabel.mutate({ ticketId, labelId: newLabel.id });
    },
    onError: (e) => {
      toast({ title: 'Failed to create label', description: (e as Error).message, variant: 'destructive' });
    },
  });

  const updateBoardLabel = api.boards.labels.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.boards.labels.list.invalidate({ boardId }), utils.boards.view.invalidate({ boardId })]);
      toast({ title: 'Label updated' });
    },
    onError: (e) => {
      toast({ title: 'Failed to update label', description: (e as Error).message, variant: 'destructive' });
    },
  });

  const deleteBoardLabel = api.boards.labels.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.boards.labels.list.invalidate({ boardId }),
        utils.boards.view.invalidate({ boardId }),
        utils.tickets.labels.list.invalidate({ ticketId }),
      ]);
      toast({ title: 'Label deleted' });
    },
    onError: (e) => {
      toast({ title: 'Failed to delete label', description: (e as Error).message, variant: 'destructive' });
    },
  });

  const createChecklist = api.tickets.checklists.create.useMutation({
    onSuccess: async () => {
      await utils.tickets.checklists.list.invalidate({ ticketId });
      toast({ title: 'Checklist created' });
    },
  });

  const updateChecklistItem = api.tickets.checklists.items.update.useMutation({
    onSuccess: async () => {
      await utils.tickets.checklists.list.invalidate({ ticketId });
    },
  });

  const deleteChecklist = api.tickets.checklists.remove.useMutation({
    onSuccess: async () => {
      await utils.tickets.checklists.list.invalidate({ ticketId });
      toast({ title: 'Checklist deleted' });
    },
  });

  const addChecklistItem = api.tickets.checklists.items.add.useMutation({
    onSuccess: async () => {
      await utils.tickets.checklists.list.invalidate({ ticketId });
    },
  });

  const uploadAttachment = api.tickets.attachments.createUpload.useMutation();

  const completeAttachment = api.tickets.attachments.complete.useMutation({
    onSuccess: async () => {
      await utils.tickets.attachments.list.invalidate({ ticketId });
      toast({ title: 'File uploaded' });
    },
  });

  const deleteAttachment = api.tickets.attachments.remove.useMutation({
    onSuccess: async () => {
      await utils.tickets.attachments.list.invalidate({ ticketId });
      toast({ title: 'Attachment deleted' });
    },
  });

  // Local state
  const [titleDraft, setTitleDraft] = React.useState('');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [descriptionDraft, setDescriptionDraft] = React.useState('');
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [newChecklistItemContent, setNewChecklistItemContent] = React.useState<Record<string, string>>({});

  // Dialog states
  const [confirmDialog, setConfirmDialog] = React.useState<{ open: boolean; title: string; description?: string; onConfirm: () => void }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });
  const [promptDialog, setPromptDialog] = React.useState<{ open: boolean; title: string; placeholder?: string; onConfirm: (value: string) => void }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });
  const [memberSelectOpen, setMemberSelectOpen] = React.useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setTitleDraft(ticket.title);
      setDescriptionDraft(ticket.description ?? '');
    }
  }, [ticket]);

  const canEdit = permissions?.canContentWrite ?? false;
  const canComment = permissions?.canCommentsWrite ?? false;
  const canAssign = permissions?.canAssignmentsWrite ?? false;

  const boardLabels = boardLabelsQuery.data ?? [];
  const ticketLabelIds = labelsQuery.data?.labelIds ?? [];

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="p-8 text-[#9fadbc] text-center">Loading ticket...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden p-0 bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#9fadbc29]">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 flex items-start justify-start pt-2">
                <FileText className="h-5 w-5 text-[#9fadbc]" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingTitle && canEdit ? (
                  <Input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      if (titleDraft.trim() && titleDraft !== ticket.title) {
                        updateTicket.mutate({ ticketId, title: titleDraft.trim() });
                      } else {
                        setTitleDraft(ticket.title);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        setTitleDraft(ticket.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="text-2xl font-semibold h-10 py-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => canEdit && setIsEditingTitle(true)}
                    className="text-2xl font-semibold hover:bg-[#a6c5e229] rounded px-3 h-10 -ml-3 transition-colors w-full text-left flex items-center"
                  >
                    {ticket.title}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Body: 2 colonnes */}
          <div className="flex flex-col lg:flex-row gap-8 px-8 py-6 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            {/* Colonne principale */}
            <div className="flex-1 space-y-8 min-w-0">
              {/* Labels (si présents) */}
              {ticketLabelIds.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="h-5 w-5 text-[#9fadbc]" />
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">Labels</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {boardLabels
                      .filter((bl) => ticketLabelIds.includes(bl.id))
                      .map((bl) => (
                        <LabelChip
                          key={bl.id}
                          name={bl.name}
                          color={bl.color}
                          onRemove={canEdit ? () => removeLabel.mutate({ ticketId, labelId: bl.id }) : undefined}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Edit3 className="h-5 w-5 text-[#9fadbc]" />
                  <h3 className="text-sm font-semibold text-[#b6c2cf]">Description</h3>
                  {!isEditingDescription && canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingDescription(true)}
                      className="ml-auto"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingDescription && canEdit ? (
                  <div className="space-y-3" data-color-mode="dark">
                    <MDEditor
                      value={descriptionDraft}
                      onChange={(val) => setDescriptionDraft(val ?? '')}
                      height={300}
                      preview="edit"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="trello"
                        onClick={() => {
                          updateTicket.mutate({ ticketId, description: descriptionDraft });
                          setIsEditingDescription(false);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescriptionDraft(ticket.description ?? '');
                          setIsEditingDescription(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => canEdit && setIsEditingDescription(true)}
                    className={cn(
                      'prose prose-invert prose-sm max-w-none p-4 rounded-lg bg-[#282e33] border border-[#9fadbc29] cursor-pointer hover:border-[#0c66e4] transition-all min-h-[100px]',
                      !ticket.description && 'text-[#9fadbc] italic flex items-center'
                    )}
                  >
                    {ticket.description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{ticket.description}</ReactMarkdown>
                    ) : (
                      'Add a more detailed description...'
                    )}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {checklistsQuery.data && checklistsQuery.data.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckSquare className="h-5 w-5 text-[#9fadbc]" />
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">Checklists</h3>
                  </div>
                  <div className="space-y-5">
                    {checklistsQuery.data.map((cl) => {
                      const completed = cl.items.filter((i) => i.isDone).length;
                      const total = cl.items.length;
                      const progress = total > 0 ? (completed / total) * 100 : 0;

                      return (
                        <div key={cl.id} className="bg-[#282e33] border border-[#9fadbc29] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold">{cl.title}</div>
                              <div className="text-xs text-[#9fadbc] mt-1">
                                {completed}/{total} completed
                              </div>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setConfirmDialog({
                                    open: true,
                                    title: 'Delete checklist',
                                    description: `Are you sure you want to delete "${cl.title}"?`,
                                    onConfirm: () => deleteChecklist.mutate({ ticketId, checklistId: cl.id }),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Progress bar */}
                          {total > 0 && (
                            <div className="mb-4 h-2 bg-[#1d2125] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0c66e4] transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            {cl.items.map((item) => (
                              <div key={item.id} className="flex items-start gap-3 group py-1">
                                <input
                                  type="checkbox"
                                  checked={item.isDone}
                                  onChange={() => {
                                    if (canEdit) {
                                      updateChecklistItem.mutate({
                                        ticketId,
                                        checklistId: cl.id,
                                        itemId: item.id,
                                        isDone: !item.isDone,
                                      });
                                    }
                                  }}
                                  disabled={!canEdit}
                                  className="mt-0.5 rounded"
                                />
                                <span className={cn('text-sm flex-1', item.isDone && 'line-through text-[#9fadbc]')}>
                                  {item.content}
                                </span>
                              </div>
                            ))}
                          </div>

                          {canEdit && (
                            <div className="mt-3 flex gap-2">
                              <Input
                                size="sm"
                                placeholder="Add an item..."
                                value={newChecklistItemContent[cl.id] ?? ''}
                                onChange={(e) =>
                                  setNewChecklistItemContent((s) => ({ ...s, [cl.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newChecklistItemContent[cl.id]?.trim()) {
                                    addChecklistItem.mutate({
                                      ticketId,
                                      checklistId: cl.id,
                                      content: newChecklistItemContent[cl.id]!.trim(),
                                    });
                                    setNewChecklistItemContent((s) => ({ ...s, [cl.id]: '' }));
                                  }
                                }}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {attachmentsQuery.data && attachmentsQuery.data.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Paperclip className="h-5 w-5 text-[#9fadbc]" />
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">Attachments</h3>
                  </div>
                  <div className="space-y-3">
                    {attachmentsQuery.data.map((att) => (
                      <div key={att.id} className="flex items-center gap-4 bg-[#282e33] border border-[#9fadbc29] rounded-lg p-4">
                        <div className="h-10 w-10 bg-[#44546f] rounded flex items-center justify-center shrink-0">
                          <Paperclip className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{att.filename}</div>
                          <div className="text-xs text-[#9fadbc] mt-1">
                            {att.size ? `${Math.round(att.size / 1024)} KB` : 'Pending'} • {new Date(att.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={att.status !== 'uploaded'}
                            onClick={async () => {
                              try {
                                const res = await utils.tickets.attachments.download.fetch({ ticketId, attachmentId: att.id });
                                window.open(res.download.url, '_blank');
                              } catch (e) {
                                toast({ title: 'Download failed', variant: 'destructive' });
                              }
                            }}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setConfirmDialog({
                                  open: true,
                                  title: 'Delete attachment',
                                  description: `Delete "${att.filename}"?`,
                                  onConfirm: () => deleteAttachment.mutate({ ticketId, attachmentId: att.id }),
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments / Activity */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="h-5 w-5 text-[#9fadbc]" />
                  <h3 className="text-sm font-semibold text-[#b6c2cf]">Activity</h3>
                </div>
                <div className="space-y-4">
                  {canComment && (
                    <div className="flex gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-[#44546f] text-white text-xs">
                          {getUserInitials('You')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="min-h-[80px] bg-[#282e33] border-[#9fadbc29]"
                        />
                        {newComment.trim() && (
                          <Button
                            size="sm"
                            variant="trello"
                            onClick={() => addComment.mutate({ ticketId, content: newComment.trim() })}
                            disabled={addComment.isPending}
                          >
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {commentsQuery.data?.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-[#44546f] text-white text-xs">
                          {initialsForUser(c.authorId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-sm font-semibold">{formatUserPrimary(c.authorId)}</div>
                          {formatUserSecondary(c.authorId) ? (
                            <div className="text-xs text-[#9fadbc]">{formatUserSecondary(c.authorId)}</div>
                          ) : null}
                          <div className="text-xs text-[#9fadbc]">{new Date(c.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="bg-[#282e33] border border-[#9fadbc29] rounded-lg p-3 text-sm">
                          {c.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-56 shrink-0 space-y-6">
              {/* Add to card */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">Add to card</div>
                <div className="space-y-2">
                  {canAssign && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-sm h-9"
                      onClick={() => setMemberSelectOpen(true)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Members
                    </Button>
                  )}
                  {canEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => setLabelManagerOpen(true)}
                      >
                        <Tag className="h-4 w-4 mr-3" />
                        Labels
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => {
                          setPromptDialog({
                            open: true,
                            title: 'Create checklist',
                            placeholder: 'Checklist title',
                            onConfirm: (title) => createChecklist.mutate({ ticketId, title }),
                          });
                        }}
                      >
                        <CheckSquare className="h-4 w-4 mr-3" />
                        Checklist
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.value = '';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            let createdAttachmentId: string | null = null;
                            let putSucceeded = false;
                            try {
                              toast({ title: 'Uploading...' });
                              const res = await uploadAttachment.mutateAsync({
                                ticketId,
                                filename: file.name,
                                contentType: file.type || 'application/octet-stream',
                                // Non-resumable PUT is simplest (no need to read Location header).
                                resumable: false,
                              });
                              createdAttachmentId = res.attachment.id;
                              const { upload } = res;
                              const putRes = await fetch(upload.url, {
                                method: upload.method,
                                headers: upload.headers,
                                body: file,
                              });
                              if (!putRes.ok) {
                                let bodyText = '';
                                try {
                                  bodyText = await putRes.text();
                                } catch {
                                  // ignore
                                }
                                throw new Error(`GCS upload failed (${putRes.status}): ${bodyText || putRes.statusText || 'Unknown error'}`);
                              }
                              putSucceeded = true;
                              await completeAttachment.mutateAsync({
                                ticketId,
                                attachmentId: createdAttachmentId,
                                size: file.size,
                              });
                            } catch (err) {
                              const error = err as Error;
                              // Best-effort cleanup: if we created a pending record but the PUT never succeeded, delete the record.
                              if (createdAttachmentId && !putSucceeded) {
                                try {
                                  await deleteAttachment.mutateAsync({ ticketId, attachmentId: createdAttachmentId });
                                } catch {
                                  // ignore
                                }
                              }
                              toast({
                                title: 'Upload failed',
                                description: error.message.includes('client_email')
                                  ? 'GCS credentials not configured'
                                  : error.message ||
                                    'Failed to upload file. If you see a CORS error in the console, update bucket CORS for your origin.',
                                variant: 'destructive',
                              });
                            }
                          };
                          input.click();
                        }}
                      >
                        <Paperclip className="h-4 w-4 mr-3" />
                        Attachment
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Separator className="bg-[#9fadbc29]" />

              {/* Assignees */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">Members</div>
                <div className="flex flex-wrap gap-2">
                  {assigneesDetailsQuery.data?.map((u) => (
                    <div key={u.id} className="relative group">
                      <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 ring-[#0c66e4] transition-all">
                        <AvatarFallback className="bg-[#44546f] text-white text-xs">
                          {initialsForUser(u.id)}
                        </AvatarFallback>
                      </Avatar>
                      {canAssign && (
                        <button
                          onClick={() => removeAssignee.mutate({ ticketId, userId: u.id })}
                          className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                  {canAssign && (
                    <button
                      className="h-9 w-9 rounded-full bg-[#282e33] border-2 border-dashed border-[#9fadbc] hover:border-[#0c66e4] hover:bg-[#2c3136] transition-all flex items-center justify-center"
                      onClick={() => setMemberSelectOpen(true)}
                    >
                      <Plus className="h-4 w-4 text-[#9fadbc]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="destructive"
        onConfirm={confirmDialog.onConfirm}
      />

      <PromptDialog
        open={promptDialog.open}
        onOpenChange={(open) => setPromptDialog({ ...promptDialog, open })}
        title={promptDialog.title}
        placeholder={promptDialog.placeholder}
        onConfirm={promptDialog.onConfirm}
      />

      <MemberSelectDialog
        open={memberSelectOpen}
        onOpenChange={setMemberSelectOpen}
        members={workspaceMembersDetailsQuery.data ?? []}
        selectedIds={assigneeIds}
        onSelect={(userId) => addAssignee.mutate({ ticketId, userId })}
      />

      <LabelManagerDialog
        open={labelManagerOpen}
        onOpenChange={setLabelManagerOpen}
        availableLabels={boardLabels}
        selectedLabelIds={ticketLabelIds}
        onToggleLabel={(labelId, isSelected) => {
          if (isSelected) {
            removeLabel.mutate({ ticketId, labelId });
          } else {
            addLabel.mutate({ ticketId, labelId });
          }
        }}
        onCreateLabel={(name, color) => {
          createBoardLabel.mutate({ boardId, name, color });
        }}
        onUpdateLabel={(labelId, name, color) => {
          updateBoardLabel.mutate({ boardId, labelId, name, color });
        }}
        onDeleteLabel={(labelId) => {
          setConfirmDialog({
            open: true,
            title: 'Delete label',
            description: 'This will remove the label from all tickets. Continue?',
            onConfirm: () => {
              deleteBoardLabel.mutate({ boardId, labelId });
            },
          });
        }}
      />
    </>
  );
}
