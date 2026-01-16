/**
 * Board Background Style Utilities
 *
 * Converts board background data into React CSS properties.
 * Supports color, gradient, and image (Unsplash) backgrounds.
 * 
 * Useful for applying backgrounds to board containers, preview images, etc.
 */

import type { BoardBackground } from '@taskly/trpc';
import type React from 'react';

/**
 * Options for background style generation
 */
type BoardBackgroundStyleOptions = {
  /** Fallback color if background is null (default: dark gray '#1d2125') */
  fallback?: string;
  /** Use thumbnail URL for images instead of full resolution (useful for previews) */
  preferThumb?: boolean;
};

/**
 * Converts a BoardBackground object into React CSSProperties.
 * Handles all background types: color, gradient, and image.
 *
 * @param background - Board background object or null/undefined
 * @param options - Configuration options
 * @returns React CSSProperties object ready for inline styles
 *
 * @example
 * ```tsx
 * // Color background
 * const style = getBoardBackgroundStyle({ type: 'color', value: '#0EA5E9' });
 * // Returns: { backgroundColor: '#0EA5E9' }
 *
 * // Gradient background
 * const style = getBoardBackgroundStyle({
 *   type: 'gradient',
 *   value: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)'
 * });
 *
 * // Image background (with thumbnail preference)
 * const style = getBoardBackgroundStyle(
 *   { type: 'image', value: { url: '...', thumbUrl: '...' } },
 *   { preferThumb: true }
 * );
 * ```
 */
export function getBoardBackgroundStyle(
  background: BoardBackground | null | undefined,
  options: BoardBackgroundStyleOptions = {},
): React.CSSProperties {
  const fallback = options.fallback ?? '#1d2125';

  // No background: use fallback color
  if (!background) {
    return { backgroundColor: fallback };
  }

  // Solid color background
  if (background.type === 'color') {
    return { backgroundColor: background.value };
  }

  // CSS gradient background
  if (background.type === 'gradient') {
    return {
      backgroundColor: fallback,
      backgroundImage: background.value,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  // Image background (Unsplash or other source)
  const imageUrl = options.preferThumb ? background.value.thumbUrl : background.value.url;
  return {
    backgroundColor: fallback,
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}

