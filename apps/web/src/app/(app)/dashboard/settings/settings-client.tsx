'use client';

import React from 'react';
import { api } from '@/app/trpc';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import { Button, Card, CardContent, Input, Textarea, useToast } from '@taskly/ui';
import { useRouter } from 'next/navigation';

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

export default function SettingsClient() {
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
      toast({ title: 'Workspace updated' });
    },
    onError: (e) => toast({ title: 'Cannot update', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const archiveWs = api.workspaces.remove.useMutation({
    onSuccess: async () => {
      await utils.workspaces.list.invalidate();
      setSelectedWorkspaceId(null);
      toast({ title: 'Workspace archived' });
      router.push('/dashboard');
    },
    onError: (e) => toast({ title: 'Cannot archive', description: trpcErrorMessage(e), variant: 'destructive' }),
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
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-[#9fadbc]">Sélectionne un workspace pour modifier ses paramètres.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[#b6c2cf]">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">Settings</h1>
        <p className="mt-2 text-[#9fadbc]">
          Workspace: <span className="text-[#b6c2cf]">{wsQuery.data?.title ?? workspaceId}</span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-semibold">Workspace profile</div>
            <div className="space-y-2">
              <div className="text-xs text-[#9fadbc]">Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Workspace title" />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[#9fadbc]">Description</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="trello"
                disabled={!title.trim() || updateWs.isPending}
                onClick={() => updateWs.mutate({ workspaceId, title: title.trim(), description })}
              >
                Save
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
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-semibold">Danger zone</div>
            <p className="text-sm text-[#9fadbc]">
              Archiver un workspace le rend inaccessible (les données restent dans la base mais il n’apparaît plus).
            </p>
            <Button
              variant="destructive"
              disabled={archiveWs.isPending}
              onClick={() => {
                if (!confirm('Archive this workspace?')) return;
                archiveWs.mutate({ workspaceId });
              }}
            >
              Archive workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


