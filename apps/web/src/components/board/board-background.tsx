import type { BoardBackground } from '@taskly/trpc';
import type React from 'react';

type BoardBackgroundStyleOptions = {
  fallback?: string;
  preferThumb?: boolean;
};

export function getBoardBackgroundStyle(
  background: BoardBackground | null | undefined,
  options: BoardBackgroundStyleOptions = {},
): React.CSSProperties {
  const fallback = options.fallback ?? '#1d2125';

  if (!background) {
    return { backgroundColor: fallback };
  }

  if (background.type === 'color') {
    return { backgroundColor: background.value };
  }

  if (background.type === 'gradient') {
    return {
      backgroundColor: fallback,
      backgroundImage: background.value,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  const imageUrl = options.preferThumb ? background.value.thumbUrl : background.value.url;
  return {
    backgroundColor: fallback,
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}

