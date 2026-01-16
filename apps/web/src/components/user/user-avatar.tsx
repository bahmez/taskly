/**
 * User Avatar Component
 *
 * Displays user avatar with support for:
 * - Uploaded image avatars
 * - Initials-based avatars with deterministic colors
 * - Gradient/color backgrounds
 *
 * Avatar generation rules:
 * 1. If user has image avatar: show image
 * 2. If user has background avatar: show initials with background
 * 3. Otherwise: show initials with color based on username hash
 *
 * Initials priority: first+last name > username > fallback
 */

import React from 'react';
import { Avatar, AvatarFallback, cn } from '@taskly/ui';
import type { BoardBackground, UserAvatar as UserAvatarType } from '@taskly/trpc';
import { getBoardBackgroundStyle } from '@/components/board/board-background';

/** Shape of user object for avatar display */
type UserLike = {
  id?: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: UserAvatarType | null;
};

/** Color palette for deterministic avatar background colors based on username */
const AVATAR_COLOR_PALETTE = [
  '#0EA5E9',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#4F46E5',
];

/**
 * Generates a deterministic color from a username using hash function.
 * Same username always generates the same color.
 * 
 * @param username - Username to hash
 * @returns Hex color from palette
 */
function colorFromUsername(username: string): string {
  const value = username.trim() || 'user';
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 0x7fffffff;
  }
  return AVATAR_COLOR_PALETTE[hash % AVATAR_COLOR_PALETTE.length]!;
}

/**
 * Generates initials from user's name or username.
 * Priority: first+last name > username > 'U' fallback
 * 
 * @param user - User object with name/username fields
 * @returns Two-character uppercase initials
 */
function initialsFromUser(user: UserLike): string {
  const first = (user.first_name ?? '').trim();
  const last = (user.last_name ?? '').trim();
  const fromNames = `${first[0] ?? ''}${last[0] ?? ''}`.trim();
  if (fromNames) return fromNames.toUpperCase();
  const username = (user.username ?? '').trim();
  if (username) return username.slice(0, 2).toUpperCase();
  return '?';
}

function avatarBackgroundStyle(avatar: UserAvatarType | null | undefined, fallback: string) {
  if (avatar?.type === 'initials' && avatar.background) {
    return getBoardBackgroundStyle(avatar.background as BoardBackground, { preferThumb: true, fallback });
  }
  return { backgroundColor: fallback };
}

export function UserAvatar({
  user,
  className,
  fallbackClassName,
}: {
  user: UserLike | null | undefined;
  className?: string;
  fallbackClassName?: string;
}) {
  const username = (user?.username ?? '').trim();
  const fallback = colorFromUsername(username);
  const style = avatarBackgroundStyle(user?.avatar ?? null, fallback);
  const imageUrl = user?.avatar?.type === 'image' ? user.avatar.image.url : null;
  const initials = initialsFromUser(user ?? {});

  return (
    <Avatar className={cn('text-white', className)} style={style}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="avatar" className="h-full w-full object-cover" />
      ) : (
        <AvatarFallback className={cn('text-xs', fallbackClassName)} style={style}>
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

