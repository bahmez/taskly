'use client';

import React from 'react';
import Link from 'next/link';
import { api } from '@/app/trpc';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input } from '@taskly/ui';
import { getBoardBackgroundStyle } from '@/components/board/board-background';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

const BOARDS_PER_PAGE = 12;

export default function WorkspaceBoardsClient({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const utils = api.useUtils();
  const { setSelectedWorkspaceId } = useWorkspaceUI();

  React.useEffect(() => {
    setSelectedWorkspaceId(workspaceId);
  }, [workspaceId, setSelectedWorkspaceId]);

  const wsQuery = api.workspaces.byId.useQuery({ workspaceId });
  const boardsQuery = api.workspaces.boards.list.useQuery({ workspaceId });
  const boards = boardsQuery.data ?? [];

  const createBoard = api.workspaces.boards.create.useMutation({
    onSuccess: async (b) => {
      await utils.workspaces.boards.list.invalidate({ workspaceId: b.workspaceId });
      router.push(`/dashboard/boards/${b.id}`);
    },
  });

  const [page, setPage] = React.useState(1);
  const [createBoardOpen, setCreateBoardOpen] = React.useState(false);
  const [boardTitle, setBoardTitle] = React.useState('');

  const totalPages = Math.max(1, Math.ceil(boards.length / BOARDS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * BOARDS_PER_PAGE;
  const pageBoards = boards.slice(start, start + BOARDS_PER_PAGE);

  if (wsQuery.isLoading) {
    return <div className="p-6 text-[#b6c2cf]">{t('dashboard.loading')}</div>;
  }

  if (!wsQuery.data) {
    return <div className="p-6 text-[#b6c2cf]">{t('dashboard.workspace_not_found')}</div>;
  }

  return (
    <div className="p-6 text-[#b6c2cf]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{wsQuery.data.title}</h1>
            {wsQuery.data.description ? <p className="mt-2 text-[#9fadbc]">{wsQuery.data.description}</p> : null}
            <div className="mt-2 text-xs text-[#9fadbc]">
              {wsQuery.data.stats?.membersCount ?? 0} member(s) • {wsQuery.data.stats?.boardsCount ?? boards.length} board(s)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
              <DialogTrigger asChild>
                <Button variant="trello">{t('navbar.create_board')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('navbar.create_board')}</DialogTitle>
                </DialogHeader>
                <Input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder={t('board.board_title_placeholder')} />
                <DialogFooter>
                  <Button
                    variant="trello"
                    disabled={!boardTitle.trim() || createBoard.isPending}
                    onClick={() => {
                      createBoard.mutate({ workspaceId, title: boardTitle.trim() });
                      setBoardTitle('');
                      setCreateBoardOpen(false);
                    }}
                  >
                    {t('actions.create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {boardsQuery.isLoading ? (
          <div className="text-sm text-[#9fadbc]">{t('dashboard.loading_boards')}</div>
        ) : boards.length === 0 ? (
          <div className="text-sm text-[#9fadbc]">{t('dashboard.no_board')}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pageBoards.map((b) => (
                <Link key={b.id} href={`/dashboard/boards/${b.id}`} className="group">
                  <div className="h-28 rounded-lg border border-[#9fadbc29] bg-[#1d2125] hover:bg-[#22272b] transition-colors overflow-hidden flex flex-col">
                    <div className="h-9" style={getBoardBackgroundStyle(b.background, { preferThumb: true })} />
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div className="text-sm font-semibold text-[#b6c2cf] group-hover:text-white truncate">{b.title}</div>
                      <div className="text-xs text-[#9fadbc]">{t('dashboard.open_board')}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  {t('dashboard.previous')}
                </Button>
                <div className="text-xs text-[#9fadbc]">
                  Page {safePage} / {totalPages}
                </div>
                <Button
                  variant="ghost"
                  className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  {t('dashboard.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
