import { Injectable } from '@nestjs/common';
import { createApi } from 'unsplash-js';
import type { BoardBackground } from '@taskly/database';

type BackgroundType = 'color' | 'gradient' | 'image';

export type ListBackgroundsInput = {
  type: BackgroundType;
  limit: number;
  cursor?: string | null;
  query?: string | null;
};

export type ListBackgroundsResult = {
  items: BoardBackground[];
  nextCursor: string | null;
};

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

function clampLimit(value: number): number {
  const v = Math.floor(Number.isFinite(value) ? value : 20);
  return Math.max(1, Math.min(50, v));
}

function parseOffset(cursor?: string | null, fallback = 0): number {
  if (!cursor) return fallback;
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function mapColor(value: string): BoardBackground {
  return { type: 'color', value };
}

function mapGradient(value: string): BoardBackground {
  return { type: 'gradient', value };
}

function mapUnsplashPhoto(photo: Record<string, unknown>): BoardBackground | null {
  const id = typeof photo.id === 'string' ? photo.id : '';
  const urls = (photo.urls as Record<string, unknown> | undefined) ?? {};
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

  const user = (photo.user as Record<string, unknown> | undefined) ?? {};
  const links = (user.links as Record<string, unknown> | undefined) ?? {};

  return {
    type: 'image',
    value: {
      source: 'unsplash',
      id,
      url,
      thumbUrl,
      blurHash: typeof photo.blur_hash === 'string' ? photo.blur_hash : null,
      color: typeof photo.color === 'string' ? photo.color : null,
      authorName: typeof user.name === 'string' ? user.name : null,
      authorUrl: typeof links.html === 'string' ? links.html : null,
    },
  };
}

@Injectable()
export class BoardBackgroundsService {
  private readonly unsplash = process.env.UNSPLASH_ACCESS_KEY
    ? createApi({ accessKey: process.env.UNSPLASH_ACCESS_KEY })
    : null;

  async list(input: ListBackgroundsInput): Promise<ListBackgroundsResult> {
    const limit = clampLimit(input.limit);

    if (input.type === 'color') {
      const offset = parseOffset(input.cursor, 0);
      const slice = COLOR_VALUES.slice(offset, offset + limit);
      const nextCursor = offset + limit < COLOR_VALUES.length ? String(offset + limit) : null;
      return { items: slice.map(mapColor), nextCursor };
    }

    if (input.type === 'gradient') {
      const offset = parseOffset(input.cursor, 0);
      const slice = GRADIENT_VALUES.slice(offset, offset + limit);
      const nextCursor = offset + limit < GRADIENT_VALUES.length ? String(offset + limit) : null;
      return { items: slice.map(mapGradient), nextCursor };
    }

    if (!this.unsplash) {
      throw new Error('Unsplash access key not configured');
    }

    const page = Math.max(1, parseOffset(input.cursor, 1));
    const query = (input.query ?? '').trim();
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

    const res = await this.unsplash.photos.list({ page, perPage: limit, orderBy: 'popular' });
    if (res.type !== 'success') throw new Error('Unsplash list failed');
    const raw =
      Array.isArray(res.response) ? res.response : (res.response as { results?: unknown[] } | null)?.results ?? [];
    const items = raw.map(mapUnsplashPhoto).filter(Boolean) as BoardBackground[];
    const hasMore = items.length === limit;
    return { items, nextCursor: hasMore ? String(page + 1) : null };
  }
}

