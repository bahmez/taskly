/**
 * Dashboard Page Client Component
 *
 * Main dashboard showing all workspaces and their boards.
 * Allows creating new workspaces and viewing boards across workspaces.
 *
 * Features:
 * - Workspace list with pagination
 * - Board preview cards with backgrounds
 * - Board quick navigation
 * - Create workspace dialog
 * - Responsive grid layout
 * - Board loading states
 */

'use client';

import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Textarea,
} from '@taskly/ui';
import { api } from '@/app/trpc';
import { getBoardBackgroundStyle } from '@/components/board/board-background';
import { useTranslation } from '@/lib/i18n';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Pagination constants
const WORKSPACES_PER_PAGE = 3;
const BOARDS_PER_PAGE = 8;

/**
 * Section displaying boards within a workspace.
 * Shows paginated board grid with backgrounds.
 * Handles loading and empty states.
 *
 * @param props - Component props
 * @param props.workspace - Workspace object
 * @param props.boardsPage - Current page number
 * @param props.setBoardsPage - Callback to update page
 */
function WorkspaceBoardsSection({
  workspace,
  boardsPage,
  setBoardsPage,
}: {
  workspace: { id: string; title: string; description: string };
  boardsPage: number;
  setBoardsPage: (next: number) => void;
}) {
  const { t } = useTranslation();
  // Query boards for this workspace
  const boardsQuery = api.workspaces.boards.list.useQuery({ workspaceId: workspace.id });
  const boards = boardsQuery.data ?? [];

  const totalPages = Math.max(1, Math.ceil(boards.length / BOARDS_PER_PAGE));
  const page = Math.min(Math.max(boardsPage, 1), totalPages);
  const start = (page - 1) * BOARDS_PER_PAGE;
  const pageBoards = boards.slice(start, start + BOARDS_PER_PAGE);

  return (
    <div className="mt-4">
      {boardsQuery.isLoading ? (
        <div className="text-sm text-[#9fadbc]">{t('dashboard.loading_boards')}</div>
      ) : boards.length === 0 ? (
        <div className="text-sm text-[#9fadbc]">{t('dashboard.no_board_in_workspace')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pageBoards.map((b) => (
              <Link key={b.id} href={`/dashboard/boards/${b.id}`} className="group">
                <div className="h-24 rounded-lg border border-[#9fadbc29] bg-[#1d2125] hover:bg-[#22272b] transition-colors overflow-hidden flex flex-col">
                  <div className="h-8" style={getBoardBackgroundStyle(b.background, { preferThumb: true })} />
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div className="text-sm font-semibold text-[#b6c2cf] group-hover:text-white truncate">{b.title}</div>
                    <div className="text-xs text-[#9fadbc]">{t('dashboard.open')}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                disabled={page <= 1}
                onClick={() => setBoardsPage(page - 1)}
              >
                {t('dashboard.previous')}
              </Button>
              <div className="text-xs text-[#9fadbc]">
                Page {page} / {totalPages}
              </div>
              <Button
                variant="ghost"
                className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                disabled={page >= totalPages}
                onClick={() => setBoardsPage(page + 1)}
              >
                {t('dashboard.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const archivedView = searchParams.get('archived') === '1';
  const utils = api.useUtils();

  const activeWorkspacesQuery = api.workspaces.list.useQuery({ archived: false }, { enabled: !archivedView });
  const archivedWorkspacesQuery = api.workspaces.list.useQuery({ archived: true }, { enabled: archivedView });

  const workspaces = (archivedView ? archivedWorkspacesQuery.data : activeWorkspacesQuery.data) ?? [];

  const createWorkspace = api.workspaces.create.useMutation({
    onSuccess: async (ws) => {
      await utils.workspaces.list.invalidate();
      router.push(`/dashboard/workspaces/${ws.id}`);
    },
  });

  const unarchive = api.workspaces.unarchive.useMutation({
    onSuccess: async () => {
      await utils.workspaces.list.invalidate();
    },
  });

  const [wsTitle, setWsTitle] = React.useState('');
  const [wsDesc, setWsDesc] = React.useState('');

  const [workspacePage, setWorkspacePage] = React.useState(1);
  const [boardsPagesByWorkspace, setBoardsPagesByWorkspace] = React.useState<Record<string, number>>({});

  if (!workspaces.length) {
    return (
      <div className="p-6 text-[#b6c2cf]">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-[#9fadbc]">
          {archivedView ? t('dashboard.no_archived_workspace') : t('dashboard.no_workspace_yet')}
        </p>

        {!archivedView && (
          <div className="mt-6 max-w-lg">
          <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.create_board')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={wsTitle} onChange={(e) => setWsTitle(e.target.value)} placeholder="Workspace title" />
              <Textarea value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} placeholder="Description (optional)" />
              <Button
                variant="trello"
                disabled={!wsTitle.trim() || createWorkspace.isPending}
                onClick={() => createWorkspace.mutate({ title: wsTitle.trim(), description: wsDesc.trim() || undefined })}
              >
                {t('actions.create')}
              </Button>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    );
  }

  const workspacesTotalPages = Math.max(1, Math.ceil(workspaces.length / WORKSPACES_PER_PAGE));
  const wsPage = Math.min(Math.max(workspacePage, 1), workspacesTotalPages);
  const wsStart = (wsPage - 1) * WORKSPACES_PER_PAGE;
  const pageWorkspaces = workspaces.slice(wsStart, wsStart + WORKSPACES_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 text-[#b6c2cf] overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-[#9fadbc] text-sm">
            {archivedView ? t('dashboard.archived_workspaces') : t('dashboard.all_workspaces')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!archivedView && (
            <Dialog>
            <DialogTrigger asChild>
              <Button variant="trelloGray" size="sm">{t('dashboard.create_board')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dashboard.create_board')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input value={wsTitle} onChange={(e) => setWsTitle(e.target.value)} placeholder="Workspace title" />
                <Textarea value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} placeholder="Description (optional)" />
              </div>
              <DialogFooter>
                <Button
                  variant="trello"
                  disabled={!wsTitle.trim() || createWorkspace.isPending}
                  onClick={() => {
                    createWorkspace.mutate({ title: wsTitle.trim(), description: wsDesc.trim() || undefined });
                    setWsTitle('');
                    setWsDesc('');
                  }}
                >
                  {t('actions.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {pageWorkspaces.map((ws) => {
          const page = boardsPagesByWorkspace[ws.id] ?? 1;
          return (
            <section key={ws.id} className="rounded-xl border border-[#9fadbc29] bg-[#1d2125] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-base sm:text-lg font-semibold text-[#b6c2cf] truncate">{ws.title}</div>
                  {ws.description ? <div className="text-sm text-[#9fadbc] mt-1 line-clamp-2">{ws.description}</div> : null}
                </div>
                {archivedView ? (
                  <Button
                    variant="trelloGray"
                    size="sm"
                    disabled={unarchive.isPending}
                    onClick={() => unarchive.mutate({ workspaceId: ws.id })}
                  >
                    {t('dashboard.remove_from_archives')}
                  </Button>
                ) : (
                  <Button asChild variant="trelloGray" size="sm">
                    <Link href={`/dashboard/workspaces/${ws.id}`}>{t('navbar.see_more')}</Link>
                  </Button>
                )}
              </div>

              {!archivedView && (
                <WorkspaceBoardsSection
                  workspace={ws}
                  boardsPage={page}
                  setBoardsPage={(next) =>
                    setBoardsPagesByWorkspace((prev) => ({
                      ...prev,
                      [ws.id]: next,
                    }))
                  }
                />
              )}
            </section>
          );
        })}

        {workspacesTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              className="text-[#9fadbc] hover:bg-[#a6c5e229]"
              disabled={wsPage <= 1}
              onClick={() => setWorkspacePage(wsPage - 1)}
            >
              {t('dashboard.previous')}
            </Button>
            <div className="text-xs text-[#9fadbc]">
              Page {wsPage} / {workspacesTotalPages}
            </div>
            <Button
              variant="ghost"
              className="text-[#9fadbc] hover:bg-[#a6c5e229]"
              disabled={wsPage >= workspacesTotalPages}
              onClick={() => setWorkspacePage(wsPage + 1)}
            >
              {t('dashboard.next')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
