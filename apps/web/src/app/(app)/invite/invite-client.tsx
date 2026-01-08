'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/app/trpc';
import { Button, Card, CardContent, useToast } from '@taskly/ui';

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

export default function InviteClient() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const utils = api.useUtils();

  const accept = api.workspaces.invitations.accept.useMutation({
    onSuccess: async (inv) => {
      await utils.workspaces.list.invalidate();
      toast({ title: 'Invitation accepted' });
      router.replace(`/dashboard/workspaces/${inv.workspaceId}`);
    },
    onError: (e) => toast({ title: 'Cannot accept', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const decline = api.workspaces.invitations.decline.useMutation({
    onSuccess: async () => {
      toast({ title: 'Invitation declined' });
      router.replace('/dashboard');
    },
    onError: (e) => toast({ title: 'Cannot decline', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  if (!token) {
    return (
      <div className="p-6 text-[#b6c2cf]">
        <h1 className="text-2xl font-semibold">Invitation</h1>
        <p className="mt-2 text-[#9fadbc]">Token manquant.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[#b6c2cf]">
      <h1 className="text-2xl font-semibold">Invitation</h1>
      <p className="mt-2 text-[#9fadbc]">Tu es sur le point de rejoindre un workspace.</p>

      <div className="mt-6 max-w-xl">
        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5 space-y-3">
            <div className="text-xs text-[#9fadbc]">Token</div>
            <div className="text-sm break-all">{token}</div>
            <div className="flex gap-2 pt-2">
              <Button variant="trello" disabled={accept.isPending} onClick={() => accept.mutate({ token })}>
                Accept
              </Button>
              <Button variant="ghost" className="text-[#9fadbc] hover:bg-[#a6c5e229]" disabled={decline.isPending} onClick={() => decline.mutate({ token })}>
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


