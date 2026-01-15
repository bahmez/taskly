'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/trpc';
import { Button, Card, CardContent } from '@taskly/ui';

const PAGE_SIZE = 20;

function formatNotificationTime(input: { createdAt?: string; createdAtMs?: number }) {
  const ms = Number.isFinite(input.createdAtMs) ? (input.createdAtMs as number) : undefined;
  const date = ms ? new Date(ms) : input.createdAt ? new Date(input.createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function NotificationsClient() {
  const router = useRouter();
  const utils = api.useUtils();

  const notificationsQuery = api.notifications.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const unreadCountQuery = api.notifications.unreadCount.useQuery();

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
  });

  const notifications = notificationsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  const notificationHref = (n: (typeof notifications)[number]) => {
    const data = n.data ?? {};
    const boardId = typeof data.boardId === 'string' ? data.boardId : null;
    if (boardId) return `/dashboard/boards/${boardId}`;
    const workspaceId = typeof data.workspaceId === 'string' ? data.workspaceId : null;
    if (workspaceId) return `/dashboard/workspaces/${workspaceId}`;
    return null;
  };

  const openNotification = (n: (typeof notifications)[number]) => {
    if (!n.readAt) markRead.mutate({ id: n.id });
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  return (
    <div className="p-6 text-[#b6c2cf]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-[#9fadbc]">
            {unreadCount > 0 ? `${unreadCount} non lue(s).` : 'Tout est à jour.'}
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-[#9fadbc] hover:bg-[#a6c5e229]"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          Tout marquer comme lu
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {notificationsQuery.isLoading ? (
          <div className="text-sm text-[#9fadbc]">Chargement…</div>
        ) : notifications.length === 0 ? (
          <div className="text-sm text-[#9fadbc]">Aucune notification pour le moment.</div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.readAt;
            const href = notificationHref(n);
            return (
              <Card key={n.id} className="border-[#9fadbc29] bg-[#1d2125]">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#579dff]" style={{ opacity: isUnread ? 1 : 0 }} />
                      <div className="text-sm font-semibold text-[#b6c2cf] truncate">{n.title}</div>
                    </div>
                    {n.body ? <div className="mt-1 text-sm text-[#9fadbc]">{n.body}</div> : null}
                    <div className="mt-2 text-xs text-[#7c8a97]">
                      {formatNotificationTime({ createdAt: n.createdAt, createdAtMs: n.createdAtMs })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                        onClick={() => markRead.mutate({ id: n.id })}
                      >
                        Marquer comme lu
                      </Button>
                    ) : null}
                    {href ? (
                      <Button variant="trello" size="sm" onClick={() => openNotification(n)}>
                        Ouvrir
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {notificationsQuery.hasNextPage ? (
        <div className="mt-6">
          <Button
            variant="ghost"
            className="text-[#9fadbc] hover:bg-[#a6c5e229]"
            disabled={notificationsQuery.isFetchingNextPage}
            onClick={() => notificationsQuery.fetchNextPage()}
          >
            Voir plus
          </Button>
        </div>
      ) : null}
    </div>
  );
}
