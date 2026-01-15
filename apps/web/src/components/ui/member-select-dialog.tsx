'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from '@taskly/ui';
import { Search, Check } from 'lucide-react';
import type { UserAvatar } from '@taskly/trpc';
import { UserAvatar as UserAvatarView } from '@/components/user/user-avatar';

interface Member {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: UserAvatar | null;
}

interface MemberSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  selectedIds: string[];
  onSelect: (userId: string) => void;
}

export function MemberSelectDialog({
  open,
  onOpenChange,
  members,
  selectedIds,
  onSelect,
}: MemberSelectDialogProps) {
  const [search, setSearch] = React.useState('');

  const filteredMembers = React.useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        (m.first_name ?? '').toLowerCase().includes(q) ||
        (m.last_name ?? '').toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9fadbc]" />
          <Input
            autoFocus
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-[#9fadbc] text-sm">No members found</div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    onSelect(member.id);
                    onOpenChange(false);
                  }}
                  disabled={isSelected}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    isSelected
                      ? 'bg-[#0c66e4] bg-opacity-20 border-[#0c66e4] cursor-not-allowed'
                      : 'bg-[#282e33] border-[#9fadbc29] hover:border-[#0c66e4] hover:bg-[#2c3136]'
                  )}
                >
                  <UserAvatarView user={member} className="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {member.first_name || member.last_name
                        ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                        : `@${member.username}`}
                    </div>
                    <div className="text-xs text-[#9fadbc]">@{member.username}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-[#0c66e4] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

