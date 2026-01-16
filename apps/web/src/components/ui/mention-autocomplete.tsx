'use client';

import React from 'react';
import { cn } from '@taskly/ui';
import type { UserAvatar } from '@taskly/trpc';
import { UserAvatar as UserAvatarView } from '@/components/user/user-avatar';

export type MentionableUser = {
  id: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: UserAvatar | null;
};

function displayFor(u: MentionableUser): string {
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return full || `@${u.username}`;
}

export type MentionMatch = { start: number; end: number; query: string };

export type MentionToken = { start: number; end: number; username: string };

export function findActiveMention(text: string, cursor: number): MentionMatch | null {
  // Look for "@<query>" right before cursor, where <query> has no whitespace.
  const upto = text.slice(0, Math.max(0, cursor));
  const lastAt = upto.lastIndexOf('@');
  if (lastAt < 0) return null;

  const before = lastAt === 0 ? ' ' : upto[lastAt - 1]!;
  // Require start or whitespace before '@' to avoid emails / mid-word triggers.
  if (!/\s/.test(before)) return null;

  const query = upto.slice(lastAt + 1);
  if (/[\s]/.test(query)) return null;
  // Avoid triggering on markdown mention syntax itself: "@[...](...)"
  if (query.startsWith('[')) return null;

  return { start: lastAt, end: cursor, query };
}

export function parseMentionTokens(text: string): MentionToken[] {
  // Mentions are stored as "@username" in plain text.
  const tokens: MentionToken[] = [];
  const re = /(^|\s)@([a-zA-Z0-9._-]{1,50})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const username = (m[2] ?? '').trim();
    if (!username) continue;
    // include the '@' in the token
    const start = m.index + (m[1] ? m[1].length : 0);
    const end = start + 1 + username.length;
    tokens.push({ start, end, username });
  }
  return tokens;
}

export function mentionMatchFromToken(t: MentionToken): MentionMatch {
  // Empty query means "show top users" for replacement.
  return { start: t.start, end: t.end, query: '' };
}

export function findMentionTokenAtCursor(text: string, cursor: number): MentionToken | null {
  const tokens = parseMentionTokens(text);
  for (const t of tokens) {
    if (cursor >= t.start && cursor <= t.end) return t;
  }
  return null;
}

export function insertMention(
  text: string,
  match: MentionMatch,
  user: MentionableUser,
): { text: string; cursor: number } {
  const token = `@${user.username}`;
  const next = text.slice(0, match.start) + token + ' ' + text.slice(match.end);
  // Place cursor after the space that follows the mention
  return { text: next, cursor: match.start + token.length + 1 };
}

export function filterMentionUsers(users: MentionableUser[], query: string): MentionableUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, 12);
  return users
    .filter((u) => {
      const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim().toLowerCase();
      return u.username.toLowerCase().includes(q) || full.includes(q);
    })
    .slice(0, 12);
}

export function MentionDropdown({
  open,
  users,
  activeIndex,
  onSelect,
  className,
}: {
  open: boolean;
  users: MentionableUser[];
  activeIndex: number;
  onSelect: (u: MentionableUser) => void;
  className?: string;
}) {
  if (!open) return null;
  if (users.length === 0) {
    return (
      <div className={cn('mt-2 rounded-lg border border-[#9fadbc29] bg-[#1d2125] p-3 text-sm text-[#9fadbc]', className)}>
        No matches
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border border-[#9fadbc29] bg-[#1d2125] shadow-lg overflow-hidden',
        'max-h-[40vh] overflow-y-auto',
        className,
      )}
      role="listbox"
      aria-label="Mention suggestions"
    >
      {users.map((u, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={u.id}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseDown={(e) => {
              // Prevent textarea blur.
              e.preventDefault();
              onSelect(u);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-colors',
              isActive ? 'bg-[#0c66e4] bg-opacity-20' : 'hover:bg-[#2c3136]',
            )}
          >
            <UserAvatarView user={u} className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{displayFor(u)}</div>
              <div className="text-xs text-[#9fadbc] truncate">@{u.username}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

