'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/app/trpc';
import { useTranslation } from '@/lib/i18n';
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Textarea,
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
  FileText,
  Calendar,
  Bell,
  Clock,
} from 'lucide-react';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { PromptDialog } from '../ui/prompt-dialog';
import { MemberSelectDialog } from '../ui/member-select-dialog';
import { LabelManagerDialog } from '../ui/label-manager-dialog';
import { UserAvatar } from '@/components/user/user-avatar';
import {
  MentionDropdown,
  filterMentionUsers,
  findActiveMention,
  insertMention,
  type MentionableUser,
  mentionMatchFromToken,
  findMentionTokenAtCursor,
} from '../ui/mention-autocomplete';

// MDEditor chargé dynamiquement (client-side only)
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  boardId: string;
}

function trpcErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Action failed';
  const msg = (err as Record<string, unknown>).message;
  return typeof msg === 'string' && msg.trim() ? msg : 'Action failed';
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string {
  // "YYYY-MM-DDTHH:mm" interpreted in local timezone.
  const d = new Date(local);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid date');
  return d.toISOString();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function TicketDialogV2({ open, onOpenChange, ticketId, boardId }: TicketDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const utils = api.useUtils();
  const activityListInput = React.useMemo(() => ({ ticketId, limit: 30, cursor: null as string | null }), [ticketId]);

  // Queries
  const ticketQuery = api.tickets.get.useQuery({ ticketId }, { enabled: open });
  const commentsQuery = api.tickets.comments.list.useQuery({ ticketId }, { enabled: open });
  const checklistsQuery = api.tickets.checklists.list.useQuery({ ticketId }, { enabled: open });
  const attachmentsQuery = api.tickets.attachments.list.useQuery({ ticketId }, { enabled: open });
  const assigneesQuery = api.tickets.assignees.list.useQuery({ ticketId }, { enabled: open });
  const meQuery = api.users.me.useQuery(undefined, { enabled: open });
  const labelsQuery = api.tickets.labels.list.useQuery({ ticketId }, { enabled: open });
  const boardLabelsQuery = api.boards.labels.list.useQuery({ boardId }, { enabled: open });
  const remindersQuery = api.tickets.reminders.list.useQuery({ ticketId }, { enabled: open });
  const ticketActivityQuery = api.tickets.activity.list.useQuery(activityListInput, { enabled: open });
  const watchQuery = api.tickets.watch.get.useQuery({ ticketId }, { enabled: open });

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

  const ticketActivity = React.useMemo(() => ticketActivityQuery.data?.items ?? [], [ticketActivityQuery.data?.items]);
  const activityUserIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const a of ticketActivity) {
      if (a.actorId) ids.push(a.actorId);
      const userId = (a.data as Record<string, unknown> | undefined)?.userId;
      if (typeof userId === 'string' && userId) ids.push(userId);
    }
    return Array.from(new Set(ids));
  }, [ticketActivity]);

  const activityUsersQuery = api.users.byIds.useQuery({ ids: activityUserIds }, { enabled: open && activityUserIds.length > 0 });

  const usersById = React.useMemo(() => {
    const all = [
      ...(assigneesDetailsQuery.data ?? []),
      ...(commentAuthorsQuery.data ?? []),
      ...(workspaceMembersDetailsQuery.data ?? []),
      ...(activityUsersQuery.data ?? []),
    ];
    return new Map(all.map((u) => [u.id, u]));
  }, [assigneesDetailsQuery.data, commentAuthorsQuery.data, workspaceMembersDetailsQuery.data, activityUsersQuery.data]);

  const mentionUsers: MentionableUser[] = React.useMemo(() => {
    const list = workspaceMembersDetailsQuery.data ?? [];
    return list
      .filter((u) => u && u.id && u.username)
      .map((u) => ({
        id: u.id,
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        avatar: u.avatar ?? null,
      }));
  }, [workspaceMembersDetailsQuery.data]);

  function linkifyMentionsMarkdown(md: string): string {
    // Legacy cleanup: old format was "@[@username](user:<id>)" which creates a double "@".
    // Convert it to "[@username](user:<id>)" first.
    md = md.replace(/@\[@([^\]]+)\]\(user:([^)]+)\)/g, '[@$1](user:$2)');

    // Convert @username occurrences (outside code blocks / inline code) to markdown links
    // so ReactMarkdown can render them as elements we can style (without real navigation).
    const segments: { kind: 'code' | 'text'; value: string }[] = [];
    let i = 0;
    while (i < md.length) {
      // fenced code block
      if (md.startsWith('```', i)) {
        const end = md.indexOf('```', i + 3);
        const j = end === -1 ? md.length : end + 3;
        segments.push({ kind: 'code', value: md.slice(i, j) });
        i = j;
        continue;
      }
      // inline code
      if (md[i] === '`') {
        const end = md.indexOf('`', i + 1);
        const j = end === -1 ? md.length : end + 1;
        segments.push({ kind: 'code', value: md.slice(i, j) });
        i = j;
        continue;
      }
      // normal text run
      let j = i + 1;
      while (j < md.length && md[j] !== '`' && !md.startsWith('```', j)) j++;
      segments.push({ kind: 'text', value: md.slice(i, j) });
      i = j;
    }
    // Match @username: require word boundary before @ (start, space, or punctuation)
    const re = /(^|[\s\n])@([a-zA-Z0-9._-]{1,50})(?=[\s\n.,!?;:]|$)/g;
    return segments
      .map((s) => {
        if (s.kind === 'code') return s.value;
        return s.value.replace(re, (_m, pre: string, username: string) => `${pre}[@${username}](mention:${username})`);
      })
      .join('');
  }

  const markdownComponents = React.useMemo(() => {
    return {
      // Links & mentions
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
        const h = href ?? '';
        if (h.startsWith('mention:')) {
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-[#0c66e4] text-white border border-[#0c66e4]/60 cursor-default no-underline text-xs font-medium" style={{ pointerEvents: 'none' }}>
              {children}
            </span>
          );
        }
        if (h.startsWith('user:')) {
          const userId = h.slice('user:'.length);
          const u = usersById.get(userId);
          const username = u?.username ?? userId;
          const childText = typeof children === 'string' ? children : String(children ?? '');
          const label = childText.startsWith('@') ? childText : `@${username}`;
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-[#0c66e4] text-white border border-[#0c66e4]/60 cursor-default no-underline text-xs font-medium" style={{ pointerEvents: 'none' }}>
              {label}
            </span>
          );
        }
        return (
          <a href={h} className="text-[#579dff] underline hover:text-[#85b8ff] break-all" target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
      // Headings
      h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold text-[#d2dce6] mt-6 mb-3 first:mt-0 border-b border-[#9fadbc29] pb-2">{children}</h1>,
      h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold text-[#d2dce6] mt-5 mb-2 first:mt-0 border-b border-[#9fadbc29] pb-1.5">{children}</h2>,
      h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold text-[#d2dce6] mt-4 mb-2 first:mt-0">{children}</h3>,
      h4: ({ children }: { children?: React.ReactNode }) => <h4 className="text-sm font-semibold text-[#d2dce6] mt-3 mb-1 first:mt-0">{children}</h4>,
      // Paragraphs
      p: ({ children }: { children?: React.ReactNode }) => <p className="text-sm text-[#b6c2cf] leading-relaxed mb-3 last:mb-0">{children}</p>,
      // Lists
      ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside text-sm text-[#b6c2cf] space-y-1 mb-3 pl-2">{children}</ul>,
      ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside text-sm text-[#b6c2cf] space-y-1 mb-3 pl-2">{children}</ol>,
      li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm text-[#b6c2cf] leading-relaxed">{children}</li>,
      // Code
      code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
        const isBlock = className?.startsWith('language-');
        if (isBlock) {
          return (
            <code className={cn('block text-xs', className)}>
              {children}
            </code>
          );
        }
        return (
          <code className="bg-[#1d2125] text-[#f78166] px-1.5 py-0.5 rounded text-xs font-mono border border-[#9fadbc29]">
            {children}
          </code>
        );
      },
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="bg-[#1d2125] border border-[#9fadbc29] rounded-lg p-4 overflow-x-auto mb-3 text-xs font-mono text-[#b6c2cf] leading-relaxed">
          {children}
        </pre>
      ),
      // Blockquote
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-4 border-[#579dff] pl-4 py-1 my-3 text-[#9fadbc] italic bg-[#1d2125]/50 rounded-r-lg">
          {children}
        </blockquote>
      ),
      // Tables
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto mb-3 rounded-lg border border-[#9fadbc29]">
          <table className="w-full text-sm text-left">{children}</table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-[#1d2125] text-[#9fadbc] text-xs uppercase">{children}</thead>,
      tbody: ({ children }: { children?: React.ReactNode }) => <tbody className="divide-y divide-[#9fadbc29]">{children}</tbody>,
      tr: ({ children }: { children?: React.ReactNode }) => <tr className="hover:bg-[#22272b]/50 transition-colors">{children}</tr>,
      th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 font-semibold text-[#b6c2cf] border-b border-[#9fadbc29]">{children}</th>,
      td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 text-[#b6c2cf]">{children}</td>,
      // Horizontal rule
      hr: () => <hr className="border-[#9fadbc29] my-4" />,
      // Images
      img: ({ src, alt }: { src?: string; alt?: string }) => (
        <img src={src} alt={alt ?? ''} className="max-w-full h-auto rounded-lg border border-[#9fadbc29] my-3" loading="lazy" />
      ),
      // Strong & emphasis
      strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-[#d2dce6]">{children}</strong>,
      em: ({ children }: { children?: React.ReactNode }) => <em className="italic text-[#b6c2cf]">{children}</em>,
      // Strikethrough (GFM)
      del: ({ children }: { children?: React.ReactNode }) => <del className="line-through text-[#9fadbc]">{children}</del>,
      // Task list items (GFM checkboxes)
      input: ({ checked, type }: { checked?: boolean; type?: string }) => {
        if (type === 'checkbox') {
          return <input type="checkbox" checked={checked} readOnly className="mr-2 rounded accent-[#579dff]" />;
        }
        return <input type={type} />;
      },
    } as const;
  }, [usersById]);

  // Keep live drafts in refs so mention callbacks don't depend on state variables
  // that might be declared later in the file (avoids TDZ issues).
  const newCommentRef = React.useRef('');
  const descriptionDraftRef = React.useRef('');

  // Mentions state (comments)
  const commentTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [commentMention, setCommentMention] = React.useState<ReturnType<typeof findActiveMention> | null>(null);
  const [commentMentionIndex, setCommentMentionIndex] = React.useState(0);

  const commentMentionCandidates = React.useMemo(() => {
    if (!commentMention) return [];
    return filterMentionUsers(mentionUsers, commentMention.query);
  }, [commentMention, mentionUsers]);

  const closeCommentMentions = React.useCallback(() => {
    setCommentMention(null);
    setCommentMentionIndex(0);
  }, []);

  const applyCommentMention = React.useCallback(
    (u: MentionableUser) => {
      const el = commentTextareaRef.current;
      if (!el) return;
      
      const currentText = el.value;
      const cursorPos = el.selectionStart ?? currentText.length;
      const match = findActiveMention(currentText, cursorPos);
      if (!match) return;

      const { text, cursor } = insertMention(currentText, match, u);
      
      setNewComment(text);
      newCommentRef.current = text;
      closeCommentMentions();
      
      // Set cursor after React updates
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      }, 0);
    },
    [closeCommentMentions],
  );

  // Mentions state (description / MDEditor textarea)
  const descTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [descMention, setDescMention] = React.useState<ReturnType<typeof findActiveMention> | null>(null);
  const [descMentionIndex, setDescMentionIndex] = React.useState(0);

  const renderCommentContent = React.useCallback((content: string) => {
    // Render comments as markdown with mention support
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {linkifyMentionsMarkdown(content)}
      </ReactMarkdown>
    );
  }, [markdownComponents]);

  const descMentionCandidates = React.useMemo(() => {
    if (!descMention) return [];
    return filterMentionUsers(mentionUsers, descMention.query);
  }, [descMention, mentionUsers]);

  const closeDescMentions = React.useCallback(() => {
    setDescMention(null);
    setDescMentionIndex(0);
  }, []);

  const applyDescMention = React.useCallback(
    (u: MentionableUser) => {
      const el = descTextareaRef.current;
      const currentText = descriptionDraftRef.current;
      if (!el) return;
      
      const cursorPos = el.selectionStart ?? currentText.length;
      // First check if cursor is inside an existing mention token
      const tokenAt = findMentionTokenAtCursor(currentText, cursorPos);
      const match = tokenAt
        ? mentionMatchFromToken(tokenAt)
        : findActiveMention(currentText, cursorPos);
      
      if (!match) return;

      const { text, cursor } = insertMention(currentText, match, u);
      setDescriptionDraft(text);
      descriptionDraftRef.current = text;
      closeDescMentions();
      
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [closeDescMentions],
  );

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


  // Mutations
  const updateTicket = api.tickets.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: t('ticket.ticket_updated') });
    },
    onError: (e) => {
      const msg = trpcErrorMessage(e);
      if (msg.includes('mention') || msg.includes('Invalid')) {
        toast({ 
          title: t('toast.invalid_mention'), 
          description: t('toast.invalid_mention_desc'),
          variant: 'destructive' 
        });
      } else {
        toast({ title: t('toast.update_failed'), description: msg, variant: 'destructive' });
      }
    },
  });

  const addComment = api.tickets.comments.add.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.tickets.comments.list.invalidate({ ticketId }), utils.tickets.activity.list.invalidate(activityListInput)]);
      setNewComment('');
      newCommentRef.current = '';
      toast({ title: t('toast.comment_added') });
    },
    onError: (e) => {
      const msg = trpcErrorMessage(e);
      if (msg.includes('mention') || msg.includes('Invalid')) {
        toast({ 
          title: t('toast.invalid_mention'), 
          description: t('toast.invalid_mention_desc'),
          variant: 'destructive' 
        });
      } else {
        toast({ title: t('toast.failed_to_add_comment'), description: msg, variant: 'destructive' });
      }
    },
  });

  const addAssignee = api.tickets.assignees.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.assignees.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
      ]);
      toast({ title: t('toast.member_added') });
    },
    onError: (e) => {
      toast({ title: t('toast.failed_to_add_member'), description: trpcErrorMessage(e), variant: 'destructive' });
    },
  });

  const removeAssignee = api.tickets.assignees.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.assignees.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
      ]);
      toast({ title: t('toast.member_removed') });
    },
  });

  const addLabel = api.tickets.labels.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.labels.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: t('toast.label_added') });
    },
  });

  const removeLabel = api.tickets.labels.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tickets.labels.list.invalidate({ ticketId }),
        utils.tickets.get.invalidate({ ticketId }),
        utils.boards.view.invalidate({ boardId }),
      ]);
      toast({ title: t('toast.label_removed') });
    },
  });

  const createBoardLabel = api.boards.labels.create.useMutation({
    onSuccess: async (newLabel) => {
      await utils.boards.labels.list.invalidate({ boardId });
      // auto-attach to ticket after creation
      addLabel.mutate({ ticketId, labelId: newLabel.id });
    },
    onError: (e) => {
      toast({ title: t('toast.failed_to_create_label'), description: trpcErrorMessage(e), variant: 'destructive' });
    },
  });

  const updateBoardLabel = api.boards.labels.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.boards.labels.list.invalidate({ boardId }), utils.boards.view.invalidate({ boardId })]);
      toast({ title: t('toast.label_updated') });
    },
    onError: (e) => {
      toast({ title: t('toast.failed_to_update_label'), description: trpcErrorMessage(e), variant: 'destructive' });
    },
  });

  const deleteBoardLabel = api.boards.labels.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.boards.labels.list.invalidate({ boardId }),
        utils.boards.view.invalidate({ boardId }),
        utils.tickets.labels.list.invalidate({ ticketId }),
      ]);
      toast({ title: t('toast.label_deleted') });
    },
    onError: (e) => {
      toast({ title: t('toast.failed_to_delete_label'), description: trpcErrorMessage(e), variant: 'destructive' });
    },
  });

  const createChecklist = api.tickets.checklists.create.useMutation({
    onSuccess: async () => {
      await utils.tickets.checklists.list.invalidate({ ticketId });
      toast({ title: t('toast.checklist_created') });
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
      toast({ title: t('toast.checklist_deleted') });
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
      toast({ title: t('toast.file_uploaded') });
    },
  });

  const deleteAttachment = api.tickets.attachments.remove.useMutation({
    onSuccess: async () => {
      await utils.tickets.attachments.list.invalidate({ ticketId });
      toast({ title: t('toast.attachment_deleted') });
    },
  });

  const createReminder = api.tickets.reminders.create.useMutation({
    onSuccess: async () => {
      await utils.tickets.reminders.list.invalidate({ ticketId });
      toast({ title: t('toast.reminder_created') });
    },
    onError: (e) => toast({ title: t('toast.failed_to_create_reminder'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const removeReminder = api.tickets.reminders.remove.useMutation({
    onSuccess: async () => {
      await utils.tickets.reminders.list.invalidate({ ticketId });
      toast({ title: t('toast.reminder_removed') });
    },
    onError: (e) => toast({ title: t('toast.failed_to_remove_reminder'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const watchTicket = api.tickets.watch.watch.useMutation({
    onSuccess: async () => {
      await utils.tickets.watch.get.invalidate({ ticketId });
      toast({ title: t('toast.watching_ticket') });
    },
    onError: (e) => toast({ title: t('toast.failed_to_watch'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const unwatchTicket = api.tickets.watch.unwatch.useMutation({
    onSuccess: async () => {
      await utils.tickets.watch.get.invalidate({ ticketId });
      toast({ title: t('toast.unwatched_ticket') });
    },
    onError: (e) => toast({ title: t('toast.failed_to_unwatch'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  // Local state
  const [titleDraft, setTitleDraft] = React.useState('');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [descriptionDraft, setDescriptionDraft] = React.useState('');
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [newChecklistItemContent, setNewChecklistItemContent] = React.useState<Record<string, string>>({});
  const [dueDateDraft, setDueDateDraft] = React.useState('');
  const [reminderDraft, setReminderDraft] = React.useState('');
  const [ticketFeedView, setTicketFeedView] = React.useState<'comments' | 'history'>('comments');

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
  const [dueDateModalOpen, setDueDateModalOpen] = React.useState(false);
  const [reminderModalOpen, setReminderModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setTitleDraft(ticket.title);
      setDescriptionDraft(ticket.description ?? '');
      descriptionDraftRef.current = ticket.description ?? '';
      setDueDateDraft(ticket.dueDate ? isoToDatetimeLocal(ticket.dueDate) : '');
    }
  }, [ticket]);

  React.useEffect(() => {
    if (open) setTicketFeedView('comments');
  }, [open]);

  const canEdit = permissions?.canContentWrite ?? false;
  const canComment = permissions?.canCommentsWrite ?? false;
  const canAssign = permissions?.canAssignmentsWrite ?? false;

  const reminders = remindersQuery.data ?? [];
  const canCreateReminder = Boolean(open); // reminders are user-scoped; permission check is server-side (ticket.content.read)
  const isWatching = watchQuery.data?.isWatching ?? false;
  const watchBusy = watchQuery.isLoading || watchTicket.isPending || unwatchTicket.isPending;

  const dueDateIso = ticket?.dueDate ?? null;
  const dueMs = dueDateIso ? Date.parse(dueDateIso) : NaN;
  const isDueValid = Number.isFinite(dueMs);
  const isOverdue = isDueValid ? dueMs < Date.now() : false;

  const boardLabels = React.useMemo(() => boardLabelsQuery.data ?? [], [boardLabelsQuery.data]);
  const ticketLabelIds = labelsQuery.data?.labelIds ?? [];
  const labelById = React.useMemo(() => new Map(boardLabels.map((l) => [l.id, l])), [boardLabels]);

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="p-8 text-[#9fadbc] text-center">{t('board.loading_ticket')}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] overflow-hidden p-0 bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          {/* Header */}
          <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 border-b border-[#9fadbc29]">
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
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 px-4 sm:px-8 py-4 sm:py-6 pb-6 sm:pb-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Colonne principale */}
            <div className="flex-1 space-y-6 sm:space-y-8 min-w-0">
              {/* Labels (si présents) */}
              {ticketLabelIds.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="h-5 w-5 text-[#9fadbc]" />
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">{t('ticket.labels')}</h3>
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
                  <h3 className="text-sm font-semibold text-[#b6c2cf]">{t('ticket.description')}</h3>
                  {!isEditingDescription && canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingDescription(true)}
                      className="ml-auto"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {t('ticket.edit')}
                    </Button>
                  )}
                </div>
                {isEditingDescription && canEdit ? (
                  <div className="space-y-3" data-color-mode="dark">
                    <MDEditor
                      value={descriptionDraft}
                      onChange={(val) => {
                        const v = val ?? '';
                        setDescriptionDraft(v);
                        descriptionDraftRef.current = v;
                      }}
                      height={300}
                      preview="edit"
                      textareaProps={{
                        onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                          const target = e.currentTarget;
                          if (!descTextareaRef.current) descTextareaRef.current = target;
                          if (!descMention) return;
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            closeDescMentions();
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setDescMentionIndex((i) => Math.min(i + 1, Math.max(0, descMentionCandidates.length - 1)));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setDescMentionIndex((i) => Math.max(i - 1, 0));
                          } else if (e.key === 'Enter' || e.key === 'Tab') {
                            const picked = descMentionCandidates[descMentionIndex];
                            if (picked) {
                              e.preventDefault();
                              applyDescMention(picked);
                            }
                          }
                        },
                        onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                          const el = e.currentTarget;
                          if (!descTextareaRef.current) descTextareaRef.current = el;
                          const cursor = el.selectionStart ?? el.value.length;
                          const token = findMentionTokenAtCursor(el.value, cursor);
                          const m = token ? mentionMatchFromToken(token) : findActiveMention(el.value, cursor);
                          setDescMention(m);
                          setDescMentionIndex(0);
                        },
                        onClick: (e: React.MouseEvent<HTMLTextAreaElement>) => {
                          const el = e.currentTarget;
                          if (!descTextareaRef.current) descTextareaRef.current = el;
                          const cursor = el.selectionStart ?? el.value.length;
                          const token = findMentionTokenAtCursor(el.value, cursor);
                          const m = token ? mentionMatchFromToken(token) : findActiveMention(el.value, cursor);
                          setDescMention(m);
                          setDescMentionIndex(0);
                        },
                        onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => {
                          const el = e.currentTarget;
                          if (!descTextareaRef.current) descTextareaRef.current = el;
                          // Small delay to allow click selection in dropdown.
                          setTimeout(() => closeDescMentions(), 150);
                        },
                      }}
                    />
                    <MentionDropdown
                      open={Boolean(descMention) && descMentionCandidates.length > 0}
                      users={descMentionCandidates}
                      activeIndex={descMentionIndex}
                      onSelect={applyDescMention}
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
                        {t('ticket.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescriptionDraft(ticket.description ?? '');
                          descriptionDraftRef.current = ticket.description ?? '';
                          setIsEditingDescription(false);
                        }}
                      >
                        {t('ticket.cancel')}
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {linkifyMentionsMarkdown(ticket.description)}
                      </ReactMarkdown>
                    ) : (
                      t('ticket.add_detailed_description')
                    )}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {checklistsQuery.data && checklistsQuery.data.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckSquare className="h-5 w-5 text-[#9fadbc]" />
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">{t('ticket.checklists')}</h3>
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
                                {completed}/{total} {t('ticket.completed')}
                              </div>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setConfirmDialog({
                                    open: true,
                                    title: t('ticket.delete_checklist_title'),
                                    description: t('ticket.delete_checklist_confirm', { name: cl.title }),
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
                                placeholder={t('ticket.add_item_placeholder')}
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
                    <h3 className="text-sm font-semibold text-[#b6c2cf]">{t('ticket.attachments')}</h3>
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
                            {att.size ? `${Math.round(att.size / 1024)} KB` : t('ticket.pending')} • {new Date(att.createdAt).toLocaleDateString()}
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
                                toast({ title: t('toast.download_failed'), variant: 'destructive' });
                              }
                            }}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {t('ticket.download')}
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setConfirmDialog({
                                  open: true,
                                  title: t('ticket.delete_attachment_title'),
                                  description: t('ticket.delete_attachment_confirm', { filename: att.filename }),
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
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                  <MessageSquare className="h-5 w-5 text-[#9fadbc] shrink-0" />
                  <h3 className="text-sm font-semibold text-[#b6c2cf]">
                    {ticketFeedView === 'history' ? t('ticket.activity_tab') : t('ticket.comments_tab')}
                  </h3>
                  <div className="ml-auto flex items-center gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant={ticketFeedView === 'comments' ? 'trello' : 'ghost'}
                      onClick={() => setTicketFeedView('comments')}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      {t('ticket.comments_tab')}
                    </Button>
                    <Button
                      size="sm"
                      variant={ticketFeedView === 'history' ? 'trello' : 'ghost'}
                      onClick={() => setTicketFeedView('history')}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      {t('ticket.history_tab')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {ticketFeedView === 'comments' && canComment && (
                    <div className="flex gap-2 sm:gap-3">
                      <UserAvatar user={meQuery.data ?? { username: 'You' }} className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
                      <div className="flex-1 space-y-3">
                        <Textarea
                          value={newComment}
                          ref={commentTextareaRef}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewComment(v);
                            newCommentRef.current = v;
                            const m = findActiveMention(v, e.target.selectionStart ?? v.length);
                            setCommentMention(m);
                            setCommentMentionIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (!commentMention) return;
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              closeCommentMentions();
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setCommentMentionIndex((i) => Math.min(i + 1, Math.max(0, commentMentionCandidates.length - 1)));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setCommentMentionIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Enter' || e.key === 'Tab') {
                              const picked = commentMentionCandidates[commentMentionIndex];
                              if (picked) {
                                e.preventDefault();
                                applyCommentMention(picked);
                              }
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => closeCommentMentions(), 150);
                          }}
                          placeholder={t('ticket.write_comment_placeholder')}
                          className="min-h-[80px] bg-[#282e33] border-[#9fadbc29]"
                        />
                        <MentionDropdown
                          open={Boolean(commentMention) && commentMentionCandidates.length > 0}
                          users={commentMentionCandidates}
                          activeIndex={commentMentionIndex}
                          onSelect={applyCommentMention}
                          className="bg-[#282e33]"
                        />
                        {newComment.trim() && (
                          <Button
                            size="sm"
                            variant="trello"
                            onClick={() => addComment.mutate({ ticketId, content: newComment.trim() })}
                            disabled={addComment.isPending}
                          >
                            {t('ticket.save')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {ticketFeedView === 'comments' &&
                    commentsQuery.data?.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <UserAvatar user={usersById.get(c.authorId)} className="h-9 w-9 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-sm font-semibold">{formatUserPrimary(c.authorId)}</div>
                          {formatUserSecondary(c.authorId) ? (
                            <div className="text-xs text-[#9fadbc]">{formatUserSecondary(c.authorId)}</div>
                          ) : null}
                          <div className="text-xs text-[#9fadbc]">{new Date(c.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="bg-[#282e33] border border-[#9fadbc29] rounded-lg p-3 text-sm prose prose-invert prose-sm max-w-none">
                          {renderCommentContent(c.content)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {ticketFeedView === 'history' && (
                    <div className="space-y-2">
                      {ticketActivity.length === 0 ? (
                        <div className="text-xs text-[#9fadbc]">{t('ticket.no_activity')}</div>
                      ) : (
                        ticketActivity.map((a) => {
                          const actor = a.actorId ? formatUserPrimary(a.actorId) : t('ticket.system');
                          const data = a.data as Record<string, unknown>;
                          const userId = typeof data?.userId === 'string' ? data.userId : null;
                          const labelId = typeof data?.labelId === 'string' ? data.labelId : null;

                          let label: string = a.type;
                          switch (a.type) {
                            case 'ticket_created':
                              label = t('ticket.ticket_created');
                              break;
                            case 'ticket_updated':
                              label = t('ticket.ticket_updated');
                              break;
                            case 'ticket_moved':
                              label = t('board.card_moved');
                              break;
                            case 'ticket_archived':
                              label = 'Ticket archived';
                              break;
                            case 'ticket_comment_added':
                              label = t('toast.comment_added');
                              break;
                            case 'ticket_comment_updated':
                              label = 'Comment updated';
                              break;
                            case 'ticket_comment_deleted':
                              label = 'Comment deleted';
                              break;
                            case 'ticket_assignee_added':
                              label = `Assignee added${userId ? `: ${formatUserPrimary(userId)}` : ''}`;
                              break;
                            case 'ticket_assignee_removed':
                              label = `Assignee removed${userId ? `: ${formatUserPrimary(userId)}` : ''}`;
                              break;
                            case 'ticket_label_added': {
                              const name = labelId ? labelById.get(labelId)?.name : null;
                              label = `Label added${name ? `: ${name}` : ''}`;
                              break;
                            }
                            case 'ticket_label_removed': {
                              const name = labelId ? labelById.get(labelId)?.name : null;
                              label = `Label removed${name ? `: ${name}` : ''}`;
                              break;
                            }
                            case 'ticket_checklist_created':
                              label = 'Checklist created';
                              break;
                            case 'ticket_checklist_updated':
                              label = 'Checklist updated';
                              break;
                            case 'ticket_checklist_deleted':
                              label = 'Checklist deleted';
                              break;
                            case 'ticket_checklist_item_added':
                              label = 'Checklist item added';
                              break;
                            case 'ticket_checklist_item_updated':
                              label = 'Checklist item updated';
                              break;
                            case 'ticket_checklist_item_deleted':
                              label = 'Checklist item deleted';
                              break;
                            case 'ticket_attachment_upload_created':
                              label = 'Attachment upload started';
                              break;
                            case 'ticket_attachment_uploaded':
                              label = 'Attachment uploaded';
                              break;
                            case 'ticket_attachment_removed':
                              label = 'Attachment removed';
                              break;
                          }

                          return (
                            <div key={a.id} className="flex items-start gap-3 bg-[#282e33] border border-[#9fadbc29] rounded-lg p-3">
                              <div className="h-9 w-9 shrink-0 rounded bg-[#1d2125] border border-[#9fadbc29] flex items-center justify-center">
                                <Clock className="h-4 w-4 text-[#9fadbc]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold">{label}</div>
                                <div className="text-xs text-[#9fadbc] mt-1">
                                  {actor} • {new Date(a.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-56 shrink-0 space-y-4 sm:space-y-6">
              {/* Due date */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">{t('ticket.due_date')}</div>
                <div className="space-y-2">
                  {dueDateIso ? (
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 bg-[#282e33]',
                        isOverdue ? 'border-red-500/40' : 'border-[#9fadbc29]',
                      )}
                    >
                      <Calendar className={cn('h-4 w-4', isOverdue ? 'text-red-300' : 'text-[#9fadbc]')} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-xs font-semibold truncate', isOverdue ? 'text-red-200' : 'text-[#b6c2cf]')}>
                          {formatDateTime(dueDateIso)}
                        </div>
                        <div className="text-[11px] text-[#9fadbc]">{isOverdue ? t('ticket.overdue') : t('ticket.due')}</div>
                      </div>
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setDueDateModalOpen(true)}>
                          {t('ticket.edit')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#9fadbc]">{t('ticket.no_due_date')}</div>
                  )}

                  {canEdit && (
                    <Button size="sm" variant="ghost" className="w-full justify-start h-9" onClick={() => setDueDateModalOpen(true)}>
                      <Calendar className="h-4 w-4 mr-3" />
                      {dueDateIso ? t('ticket.change_due_date') : t('ticket.set_due_date')}
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-[#9fadbc29]" />

              {/* Watch / Unwatch */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">{t('ticket.notifications_section')}</div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start h-9"
                  disabled={watchBusy}
                  onClick={() => (isWatching ? unwatchTicket.mutate({ ticketId }) : watchTicket.mutate({ ticketId }))}
                >
                  <Bell className={cn('h-4 w-4 mr-3', isWatching ? 'text-[#0c66e4]' : 'text-[#9fadbc]')} />
                  {isWatching ? t('ticket.unwatch') : t('ticket.watch')}
                </Button>
              </div>

              <Separator className="bg-[#9fadbc29]" />

              {/* Reminders */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">{t('ticket.reminders_section')}</div>
                <div className="space-y-3">
                  {/* List */}
                  {reminders.length > 0 ? (
                    <div className="space-y-2">
                      {reminders.map((r) => {
                        const isSent = Boolean(r.sentAt);
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 rounded-lg bg-[#282e33] border border-[#9fadbc29] px-3 py-2"
                          >
                            <Bell className={cn('h-4 w-4', isSent ? 'text-[#9fadbc]' : 'text-[#0c66e4]')} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate">
                                {formatDateTime(r.remindAt)}
                              </div>
                              <div className="text-[11px] text-[#9fadbc]">
                                {isSent ? `Sent ${formatDateTime(r.sentAt!)}` : t('ticket.pending')}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeReminder.mutate({ ticketId, reminderId: r.id })}
                              disabled={removeReminder.isPending}
                              aria-label="Remove reminder"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-[#9fadbc]">{t('ticket.no_reminders')}</div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start h-9"
                    disabled={!canCreateReminder}
                    onClick={() => setReminderModalOpen(true)}
                  >
                    <Bell className="h-4 w-4 mr-3" />
                    {t('ticket.add_reminder_btn')}
                  </Button>
                </div>
              </div>

              <Separator className="bg-[#9fadbc29]" />

              {/* Add to card */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">{t('ticket.add_to_card')}</div>
                <div className="space-y-2">
                  {canAssign && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-sm h-9"
                      onClick={() => setMemberSelectOpen(true)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      {t('ticket.members_button')}
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
                        {t('ticket.labels_button')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => {
                          setPromptDialog({
                            open: true,
                            title: t('ticket.create_checklist_dialog'),
                            placeholder: t('ticket.checklist_title_placeholder'),
                            onConfirm: (title) => createChecklist.mutate({ ticketId, title }),
                          });
                        }}
                      >
                        <CheckSquare className="h-4 w-4 mr-3" />
                        {t('ticket.checklist_button')}
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
                              toast({ title: t('toast.uploading') });
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
                                title: t('toast.upload_failed'),
                                description: error.message.includes('client_email')
                                  ? t('navbar.gcs_credentials_not_configured')
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
                        {t('ticket.attachment_button')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Separator className="bg-[#9fadbc29]" />

              {/* Assignees */}
              <div>
                <div className="text-xs font-semibold text-[#9fadbc] mb-3 uppercase tracking-wide">{t('ticket.members_section')}</div>
                <div className="flex flex-wrap gap-2">
                  {assigneesDetailsQuery.data?.map((u) => (
                    <div key={u.id} className="relative group">
                      <UserAvatar user={u} className="h-9 w-9 cursor-pointer hover:ring-2 ring-[#0c66e4] transition-all" />
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

      {/* Due date modal */}
      <Dialog open={dueDateModalOpen} onOpenChange={setDueDateModalOpen}>
        <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#9fadbc]" />
              <div className="text-sm font-semibold">{t('ticket.set_due_date')}</div>
            </div>
            <Input
              type="datetime-local"
              value={dueDateDraft}
              onChange={(e) => setDueDateDraft(e.target.value)}
              disabled={!canEdit}
              className="h-10"
            />
            <div className="flex gap-2">
              <Button
                variant="trello"
                className="flex-1"
                disabled={!canEdit || updateTicket.isPending}
                onClick={() => {
                  try {
                    const iso = dueDateDraft ? datetimeLocalToIso(dueDateDraft) : null;
                    updateTicket.mutate({ ticketId, dueDate: iso });
                    setDueDateModalOpen(false);
                  } catch {
                    toast({ title: t('toast.invalid_date'), variant: 'destructive' });
                  }
                }}
              >
                {t('actions.save')}
              </Button>
              <Button
                variant="ghost"
                disabled={!canEdit || updateTicket.isPending}
                onClick={() => {
                  setDueDateDraft('');
                  updateTicket.mutate({ ticketId, dueDate: null });
                  setDueDateModalOpen(false);
                }}
              >
                {t('actions.close')}
              </Button>
            </div>
            {dueDateIso && <div className="text-xs text-[#9fadbc]">Current: {formatDateTime(dueDateIso)}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder modal */}
      <Dialog open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
        <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[#9fadbc]" />
              <div className="text-sm font-semibold">{t('ticket.add_to_card')}</div>
            </div>
            <Input
              type="datetime-local"
              value={reminderDraft}
              onChange={(e) => setReminderDraft(e.target.value)}
              disabled={!canCreateReminder}
              className="h-10"
            />
            <div className="flex gap-2">
              <Button
                variant="trello"
                className="flex-1"
                disabled={!canCreateReminder || !reminderDraft || createReminder.isPending}
                onClick={() => {
                  try {
                    const iso = datetimeLocalToIso(reminderDraft);
                    createReminder.mutate({ ticketId, remindAt: iso });
                    setReminderDraft('');
                    setReminderModalOpen(false);
                  } catch {
                    toast({ title: t('toast.invalid_date'), variant: 'destructive' });
                  }
                }}
              >
                {t('actions.create')}
              </Button>
              <Button variant="ghost" onClick={() => setReminderModalOpen(false)} disabled={createReminder.isPending}>
                {t('actions.cancel')}
              </Button>
            </div>

            <Separator className="bg-[#9fadbc29]" />

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#9fadbc] uppercase tracking-wide">{t('ticket.presets')}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 min-w-[120px]"
                  disabled={!ticket.dueDate || createReminder.isPending}
                  onClick={() => {
                    if (!ticket.dueDate) return;
                    const due = new Date(ticket.dueDate).getTime();
                    const remindAt = new Date(due - 60 * 60_000).toISOString(); // 1h before
                    createReminder.mutate({ ticketId, remindAt });
                    setReminderModalOpen(false);
                  }}
                >
                  {t('ticket.one_hour_before')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 min-w-[120px]"
                  disabled={!ticket.dueDate || createReminder.isPending}
                  onClick={() => {
                    if (!ticket.dueDate) return;
                    const due = new Date(ticket.dueDate).getTime();
                    const remindAt = new Date(due - 24 * 60 * 60_000).toISOString(); // 1d before
                    createReminder.mutate({ ticketId, remindAt });
                    setReminderModalOpen(false);
                  }}
                >
                  {t('ticket.one_day_before')}
                </Button>
              </div>
              {!ticket.dueDate && <div className="text-xs text-[#9fadbc]">{t('ticket.set_due_date_for_presets')}</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
