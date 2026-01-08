'use client';

import React from 'react';
import { api } from '@/app/trpc';
import { useWorkspaceUI } from '@/components/workspace/workspace-ui-provider';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@taskly/ui';

const ROLES = ['admin', 'maintainer', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

function trpcErrorMessage(err: unknown): string {
  const anyErr = err as { message?: string };
  return anyErr?.message ?? 'Action failed';
}

function MemberRow({
  workspaceId,
  member,
  membersCount,
  adminsCount,
  onUpdateRole,
  onRemove,
}: {
  workspaceId: string;
  member: { userId: string; role: Role };
  membersCount: number;
  adminsCount: number;
  onUpdateRole: (userId: string, role: Role) => void;
  onRemove: (userId: string, label: string) => void;
}) {
  const uq = api.users.byId.useQuery(
    { id: member.userId },
    {
      staleTime: 60_000,
    },
  );

  const fullName = `${uq.data?.first_name ?? ''} ${uq.data?.last_name ?? ''}`.trim();
  const label = fullName || uq.data?.username || member.userId;
  const secondary = uq.data?.username && fullName ? `@${uq.data.username}` : '';
  const isLastMember = membersCount <= 1;
  const isLastAdmin = member.role === 'admin' && adminsCount <= 1;
  const cannotRemove = isLastMember || isLastAdmin;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#9fadbc29] p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        {secondary ? <div className="text-xs text-[#9fadbc] truncate">{secondary}</div> : null}
      </div>

      <div className="flex items-center gap-2">
        <Select value={member.role} onValueChange={(v) => onUpdateRole(member.userId, v as Role)}>
          <SelectTrigger className="h-9 w-[140px] bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          className="h-9 text-[#9fadbc] hover:bg-[#a6c5e229]"
          disabled={cannotRemove}
          onClick={() => {
            if (!confirm(`Remove ${label}?`)) return;
            onRemove(member.userId, label);
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function MembersClient() {
  const { toast } = useToast();
  const utils = api.useUtils();
  const { selectedWorkspaceId } = useWorkspaceUI();

  const workspaceId = selectedWorkspaceId;

  const wsQuery = api.workspaces.byId.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: Boolean(workspaceId) },
  );

  const membersQuery = api.workspaces.members.list.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: Boolean(workspaceId) },
  );

  const [q, setQ] = React.useState('');
  const usersSearch = api.users.search.useQuery(
    { q, limit: 10 },
    { enabled: q.trim().length >= 2 },
  );

  const addMember = api.workspaces.members.add.useMutation({
    onSuccess: async () => {
      await utils.workspaces.members.list.invalidate({ workspaceId: workspaceId! });
      toast({ title: 'Member added' });
    },
    onError: (e) => toast({ title: 'Cannot add member', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const updateRole = api.workspaces.members.updateRole.useMutation({
    onSuccess: async () => {
      await utils.workspaces.members.list.invalidate({ workspaceId: workspaceId! });
      toast({ title: 'Role updated' });
    },
    onError: (e) => toast({ title: 'Cannot update role', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const removeMember = api.workspaces.members.remove.useMutation({
    onSuccess: async () => {
      await utils.workspaces.members.list.invalidate({ workspaceId: workspaceId! });
      toast({ title: 'Member removed' });
    },
    onError: (e) => toast({ title: 'Cannot remove member', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const createInvite = api.workspaces.invitations.create.useMutation({
    onSuccess: async (inv) => {
      await utils.workspaces.invitations.list.invalidate({ workspaceId: inv.workspaceId });
      setLastInviteToken(inv.token);
      toast({ title: 'Invitation created' });
    },
    onError: (e) => toast({ title: 'Cannot create invitation', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const invitationsQuery = api.workspaces.invitations.list.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: Boolean(workspaceId) },
  );

  const cancelInvite = api.workspaces.invitations.cancel.useMutation({
    onSuccess: async () => {
      await utils.workspaces.invitations.list.invalidate({ workspaceId: workspaceId! });
      toast({ title: 'Invitation cancelled' });
    },
    onError: (e) => toast({ title: 'Cannot cancel invitation', description: trpcErrorMessage(e), variant: 'destructive' }),
  });

  const members = membersQuery.data ?? [];
  const membersCount = members.length;
  const adminsCount = members.filter((m) => m.role === 'admin').length;

  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<Role>('viewer');

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteRole, setInviteRole] = React.useState<Role>('viewer');
  const [inviteDays, setInviteDays] = React.useState(7);
  const [lastInviteToken, setLastInviteToken] = React.useState<string | null>(null);

  const getInviteLink = (token: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied' });
    } catch {
      toast({ title: 'Cannot copy', description: 'Clipboard not available', variant: 'destructive' });
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-6 text-[#b6c2cf]">
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="mt-2 text-[#9fadbc]">Sélectionne un workspace pour gérer ses membres.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[#b6c2cf]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">Members</h1>
          <p className="mt-2 text-[#9fadbc]">
            Workspace: <span className="text-[#b6c2cf]">{wsQuery.data?.title ?? workspaceId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="trelloGray">Add member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user (min 2 chars)" />

                <div className="max-h-56 overflow-auto rounded-md border border-[#9fadbc29]">
                  {usersSearch.isLoading ? (
                    <div className="p-3 text-sm text-[#9fadbc]">Searching…</div>
                  ) : (usersSearch.data?.length ?? 0) === 0 ? (
                    <div className="p-3 text-sm text-[#9fadbc]">No results.</div>
                  ) : (
                    <div className="divide-y divide-[#9fadbc29]">
                      {usersSearch.data!.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[#22272b] transition-colors"
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          <div className="text-sm text-[#b6c2cf] font-medium">{u.username}</div>
                          <div className="text-xs text-[#9fadbc]">{u.id}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-[#9fadbc]">Role</div>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="trello"
                  disabled={!selectedUserId || addMember.isPending}
                  onClick={() => {
                    if (!selectedUserId) return;
                    addMember.mutate({ workspaceId, userId: selectedUserId, role: selectedRole });
                    setAddOpen(false);
                    setSelectedUserId(null);
                    setQ('');
                  }}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="trello">Create invite</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create invitation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-[#9fadbc]">Role</div>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-[#9fadbc]">Expires in (days)</div>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={inviteDays}
                    onChange={(e) => setInviteDays(Number(e.target.value))}
                  />
                </div>

                {createInvite.data?.token ? (
                  <div className="rounded-md border border-[#9fadbc29] p-3">
                    <div className="text-xs text-[#9fadbc] mb-1">Token</div>
                    <div className="text-sm break-all">{createInvite.data.token}</div>
                  </div>
                ) : null}

                {lastInviteToken ? (
                  <div className="rounded-md border border-[#9fadbc29] p-3">
                    <div className="text-xs text-[#9fadbc] mb-1">Invitation link</div>
                    <div className="text-sm break-all">{getInviteLink(lastInviteToken)}</div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="trelloGray" onClick={() => copyToClipboard(getInviteLink(lastInviteToken))}>
                        Copy link
                      </Button>
                      <Button asChild variant="ghost" className="text-[#9fadbc] hover:bg-[#a6c5e229]">
                        <a href={getInviteLink(lastInviteToken)} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  variant="trello"
                  disabled={createInvite.isPending}
                  onClick={() => createInvite.mutate({ workspaceId, role: inviteRole, expiresInDays: inviteDays })}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5">
            <div className="text-sm font-semibold">Members ({members.length})</div>
            <div className="mt-4 space-y-3">
              {membersQuery.isLoading ? (
                <div className="text-sm text-[#9fadbc]">Loading…</div>
              ) : members.length === 0 ? (
                <div className="text-sm text-[#9fadbc]">No members.</div>
              ) : (
                members.map((m) => (
                  <MemberRow
                    key={m.userId}
                    workspaceId={workspaceId}
                    membersCount={membersCount}
                    adminsCount={adminsCount}
                    member={{ userId: m.userId, role: m.role as Role }}
                    onUpdateRole={(userId, role) => {
                      const target = members.find((x) => x.userId === userId);
                      if (!target) return;
                      if (target.role === 'admin' && adminsCount <= 1 && role !== 'admin') {
                        toast({
                          title: 'Impossible',
                          description: 'Tu ne peux pas retirer le dernier admin.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      updateRole.mutate({ workspaceId, userId, role });
                    }}
                    onRemove={(userId) => {
                      const target = members.find((x) => x.userId === userId);
                      if (!target) return;
                      if (membersCount <= 1) {
                        toast({
                          title: 'Impossible',
                          description: 'Tu ne peux pas supprimer le dernier membre du workspace.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      if (target.role === 'admin' && adminsCount <= 1) {
                        toast({
                          title: 'Impossible',
                          description: 'Tu ne peux pas supprimer le dernier admin.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      removeMember.mutate({ workspaceId, userId });
                    }}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf]">
          <CardContent className="p-5">
            <div className="text-sm font-semibold">Pending invitations</div>
            <div className="mt-4 space-y-3">
              {invitationsQuery.isLoading ? (
                <div className="text-sm text-[#9fadbc]">Loading…</div>
              ) : (invitationsQuery.data?.length ?? 0) === 0 ? (
                <div className="text-sm text-[#9fadbc]">No pending invitations.</div>
              ) : (
                invitationsQuery.data!.map((inv) => (
                  <div key={inv.id} className="rounded-md border border-[#9fadbc29] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Role: {inv.role}</div>
                        <div className="text-xs text-[#9fadbc]">Expires: {inv.expiresAt}</div>
                        <div className="text-xs text-[#9fadbc] mt-2 break-all">Token: {inv.token}</div>
                        <div className="text-xs text-[#9fadbc] mt-2 break-all">Link: {getInviteLink(inv.token)}</div>
                        <div className="mt-2 flex gap-2">
                          <Button variant="trelloGray" onClick={() => copyToClipboard(getInviteLink(inv.token))}>
                            Copy link
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                        onClick={() => cancelInvite.mutate({ workspaceId, invitationId: inv.id })}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


