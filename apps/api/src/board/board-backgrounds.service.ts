/**
 * Board Backgrounds Service
 *
 * Provides a catalog of board background options:
 * - Solid colors (predefined palette)
 * - Gradients (predefined gradients)
 * - Unsplash photos (dynamically fetched)
 *
 * Supports pagination via cursor for background browsing.
 * Integrates with Unsplash API for stock photography.
 */

import { Injectable } from '@nestjs/common';
import { createApi } from 'unsplash-js';
import type { BoardBackground } from '@taskly/database';

/** Union type for background source types */
type BackgroundType = 'color' | 'gradient' | 'image';

/** Input parameters for listing backgrounds */
export type ListBackgroundsInput = {
  /** Type of background to list: color, gradient, or image */
  type: BackgroundType;
  /** Maximum number of items to return (clamped to 1-50) */
  limit: number;
  /** Pagination cursor from previous request */
  cursor?: string | null;
  /** Search query for images (only used when type='image') */
  query?: string | null;
};

/** Result of listing backgrounds with pagination info */
export type ListBackgroundsResult = {
  /** Array of background objects */
  items: BoardBackground[];
  /** Cursor for fetching next page (null if no more results) */
  nextCursor: string | null;
};

/**
 * Predefined color palette for board backgrounds.
 * Includes neutral, cool, and warm tones.
 */
const COLOR_VALUES: string[] = [
  '#0F172A',
  '#1E293B',
  '#334155',
  '#0F766E',
  '#0EA5E9',
  '#2563EB',
  '#4338CA',
  '#7C3AED',
  '#C026D3',
  '#DB2777',
  '#E11D48',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
];

/**
 * Predefined gradient palette for board backgrounds.
 * Includes directional gradients with complementary colors.
 */
const GRADIENT_VALUES: string[] = [
  'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
  'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)',
  'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
  'linear-gradient(135deg, #DB2777 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #0F766E 0%, #22C55E 100%)',
  'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)',
  'linear-gradient(135deg, #F43F5E 0%, #F97316 100%)',
  'linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)',
];

/**
 * Clamps limit value to valid range (1-50).
 * @param value - The limit to clamp
 * @returns Clamped value between 1 and 50
 */
function clampLimit(value: number): number {
  const v = Math.floor(Number.isFinite(value) ? value : 20);
  return Math.max(1, Math.min(50, v));
}

/**
 * Parses a cursor string into a numeric offset.
 * @param cursor - The cursor string from pagination
 * @param fallback - Default value if cursor is invalid (default 0)
 * @returns Numeric offset or fallback value
 */
function parseOffset(cursor?: string | null, fallback = 0): number {
  if (!cursor) return fallback;
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/**
 * Wraps a color value in BoardBackground type.
 * @param value - Hex color code
 * @returns BoardBackground with color type
 */
function mapColor(value: string): BoardBackground {
  return { type: 'color', value };
}

/**
 * Wraps a gradient value in BoardBackground type.
 * @param value - CSS gradient string
 * @returns BoardBackground with gradient type
 */
function mapGradient(value: string): BoardBackground {
  return { type: 'gradient', value };
}

/**
 * Extracts and validates image data from Unsplash API response.
 * Safely handles missing/malformed Unsplash response data.
 * 
 * @param photo - Unsplash photo object from API
 * @returns BoardBackground with image type, or null if data is invalid
 */
function mapUnsplashPhoto(photo: unknown): BoardBackground | null {
  if (!photo || typeof photo !== 'object') return null;
  const data = photo as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id : '';
  const urls = (data.urls as Record<string, unknown> | undefined) ?? {};
  const url =
    (typeof urls.full === 'string' && urls.full) ||
    (typeof urls.regular === 'string' && urls.regular) ||
    (typeof urls.raw === 'string' && urls.raw) ||
    '';
  const thumbUrl =
    (typeof urls.small === 'string' && urls.small) ||
    (typeof urls.thumb === 'string' && urls.thumb) ||
    (typeof urls.regular === 'string' && urls.regular) ||
    url ||
    '';
  if (!id || !url || !thumbUrl) return null;

  const user = (data.user as Record<string, unknown> | undefined) ?? {};
  const links = (user.links as Record<string, unknown> | undefined) ?? {};

  return {
    type: 'image',
    value: {
      source: 'unsplash',
      id,
      url,
      thumbUrl,
      blurHash: typeof data.blur_hash === 'string' ? data.blur_hash : null,
      color: typeof data.color === 'string' ? data.color : null,
      authorName: typeof user.name === 'string' ? user.name : null,
      authorUrl: typeof links.html === 'string' ? links.html : null,
    },
  };
}

/**
 * Service for managing board background options.
 * Provides access to color, gradient, and image backgrounds via pagination.
 */
@Injectable()
export class BoardBackgroundsService {
  /** Unsplash API client (initialized if API key is configured) */
  private readonly unsplash = process.env.UNSPLASH_ACCESS_KEY
    ? createApi({ accessKey: process.env.UNSPLASH_ACCESS_KEY })
    : null;

  /**
   * Lists background options of the specified type.
   * Supports pagination via cursor for colors, gradients, and Unsplash images.
   * 
   * For colors and gradients, pagination uses numeric offsets.
   * For images (Unsplash), pagination uses page numbers.
   * 
   * @param input - Listing parameters (type, limit, cursor, query)
   * @returns Array of backgrounds for current page with nextCursor for pagination
   * @throws Error if Unsplash access key not configured when requesting images
   * @throws Error if Unsplash API request fails
   * 
   * @example
   * // List predefined colors
   * const { items, nextCursor } = await service.list({
   *   type: 'color',
   *   limit: 10
   * });
   * 
   * @example
   * // Search Unsplash for landscape photos
   * const result = await service.list({
   *   type: 'image',
   *   limit: 12,
   *   query: 'nature'
   * });
   */
  async list(input: ListBackgroundsInput): Promise<ListBackgroundsResult> {
    const limit = clampLimit(input.limit);

    // Serve predefined colors with offset-based pagination
    if (input.type === 'color') {
      const offset = parseOffset(input.cursor, 0);
      const slice = COLOR_VALUES.slice(offset, offset + limit);
      const nextCursor = offset + limit < COLOR_VALUES.length ? String(offset + limit) : null;
      return { items: slice.map(mapColor), nextCursor };
    }

    // Serve predefined gradients with offset-based pagination
    if (input.type === 'gradient') {
      const offset = parseOffset(input.cursor, 0);
      const slice = GRADIENT_VALUES.slice(offset, offset + limit);
      const nextCursor = offset + limit < GRADIENT_VALUES.length ? String(offset + limit) : null;
      return { items: slice.map(mapGradient), nextCursor };
    }

    // Serve Unsplash images (requires configured API key)
    if (!this.unsplash) {
      throw new Error('Unsplash access key not configured');
    }

    const page = Math.max(1, parseOffset(input.cursor, 1));
    const query = (input.query ?? '').trim();
    
    // Search mode: query-based search with pagination
    if (query) {
      const res = await this.unsplash.search.getPhotos({
        query,
        page,
        perPage: limit,
        orientation: 'landscape',
      });
      if (res.type !== 'success') throw new Error('Unsplash search failed');
      const items = res.response.results.map(mapUnsplashPhoto).filter(Boolean) as BoardBackground[];
      const hasMore = page < res.response.total_pages;
      return { items, nextCursor: hasMore ? String(page + 1) : null };
    }

    // Browse mode: curated photos list
    const res = await this.unsplash.photos.list({
      page,
      perPage: limit,
    });
    if (res.type !== 'success') throw new Error('Unsplash list failed');
    const raw =
      Array.isArray(res.response) ? res.response : (res.response as { results?: unknown[] } | null)?.results ?? [];
    const items = raw.map(mapUnsplashPhoto).filter(Boolean) as BoardBackground[];
    const hasMore = items.length === limit;
    return { items, nextCursor: hasMore ? String(page + 1) : null };
  }
}

