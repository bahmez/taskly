'use client';

import React from 'react';
import { api } from '@/app/trpc';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import { Button, Card, CardContent, Input, Textarea, useToast } from '@taskly/ui';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

export default function SettingsClient() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceUI();

  const workspaceId = selectedWorkspaceId;

  const wsQuery = api.workspaces.byId.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: Boolean(workspaceId) },
  );

  const updateWs = api.workspaces.update.useMutation({
    onSuccess: async (ws) => {
      await utils.workspaces.byId.invalidate({ workspaceId: ws.id });
      await utils.workspaces.list.invalidate();
      toast({ title: t('toast.workspace_updated') });
    },
    onError: (e) => toast({ title: t('toast.cannot_update'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const archiveWs = api.workspaces.remove.useMutation({
    onSuccess: async () => {
      await utils.workspaces.list.invalidate();
      setSelectedWorkspaceId(null);
      toast({ title: t('toast.workspace_archived') });
      router.push('/dashboard');
    },
    onError: (e) => toast({ title: t('toast.cannot_archive'), description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (!wsQuery.data) return;
    setTitle(wsQuery.data.title ?? '');
    setDescription(wsQuery.data.description ?? '');
  }, [wsQuery.data]);

  if (!workspaceId) {
    return (
      <div className="p-6 text-[#b6c2cf]">
        <h1 className="text-2xl font-semibold">{t('settings.page_title')}</h1>
        <p className="mt-2 text-[#9fadbc]">{t('settings.select_workspace')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[#b6c2cf]">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{t('settings.page_title')}</h1>
        <p className="mt-2 text-[#9fadbc]">
          Workspace: <span className="text-[#b6c2cf]">{wsQuery.data?.title ?? workspaceId}</span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-semibold">{t('settings.workspace_profile')}</div>
            <div className="space-y-2">
              <div className="text-xs text-[#9fadbc]">{t('settings.title_label')}</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('settings.workspace_title_placeholder')} />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[#9fadbc]">{t('settings.description_label')}</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('settings.description_placeholder')} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="trello"
                disabled={!title.trim() || updateWs.isPending}
                onClick={() => updateWs.mutate({ workspaceId, title: title.trim(), description })}
              >
                {t('actions.save')}
              </Button>
              <Button
                variant="ghost"
                className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                onClick={() => {
                  if (!wsQuery.data) return;
                  setTitle(wsQuery.data.title ?? '');
                  setDescription(wsQuery.data.description ?? '');
                }}
              >
                {t('settings.reset_button')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-semibold">{t('settings.danger_zone')}</div>
            <p className="text-sm text-[#9fadbc]">
              {t('settings.archive_description')}
            </p>
            <Button
              variant="destructive"
              disabled={archiveWs.isPending}
              onClick={() => {
                if (!confirm(t('settings.archive_confirm'))) return;
                archiveWs.mutate({ workspaceId });
              }}
            >
              {t('settings.archive_button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
