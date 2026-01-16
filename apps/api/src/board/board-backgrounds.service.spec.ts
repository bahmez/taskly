import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardBackgroundsService } from './board-backgrounds.service.js';
import { createApi } from 'unsplash-js';

vi.mock('unsplash-js', () => ({ createApi: vi.fn() }));

describe('BoardBackgroundsService', () => {
  const createApiMock = createApi as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createApiMock.mockReset();
    delete process.env.UNSPLASH_ACCESS_KEY;
  });

  it('paginates colors list', async () => {
    const service = new BoardBackgroundsService();

    const first = await service.list({ type: 'color', limit: 3 });
    const second = await service.list({ type: 'color', limit: 3, cursor: first.nextCursor });

    expect(first.items).toHaveLength(3);
    expect(first.items[0]).toMatchObject({ type: 'color' });
    expect(first.nextCursor).toBe('3');
    expect(second.items[0]).toMatchObject({ type: 'color' });
    expect(second.items[0]).not.toEqual(first.items[0]);
  });

  it('paginates gradients list', async () => {
    const service = new BoardBackgroundsService();

    const first = await service.list({ type: 'gradient', limit: 2 });
    const second = await service.list({ type: 'gradient', limit: 2, cursor: first.nextCursor });

    expect(first.items).toHaveLength(2);
    expect(first.items[0]).toMatchObject({ type: 'gradient' });
    expect(first.nextCursor).toBe('2');
    expect(second.items[0]).toMatchObject({ type: 'gradient' });
    expect(second.items[0]).not.toEqual(first.items[0]);
  });

  it('throws if Unsplash access key is missing', async () => {
    const service = new BoardBackgroundsService();
    await expect(service.list({ type: 'image', limit: 2 })).rejects.toThrow(/Unsplash access key/i);
  });

  it('lists Unsplash images', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key';
    const list = vi.fn().mockResolvedValue({
      type: 'success',
      response: [
        {
          id: 'p1',
          urls: { regular: 'https://img/regular', small: 'https://img/small' },
          user: { name: 'Alice', links: { html: 'https://unsplash.com/@alice' } },
          color: '#ffffff',
          blur_hash: 'hash',
        },
      ],
    });

    createApiMock.mockReturnValueOnce({
      photos: { list },
      search: { getPhotos: vi.fn() },
    });

    const service = new BoardBackgroundsService();
    const res = await service.list({ type: 'image', limit: 1 });

    expect(list).toHaveBeenCalledWith({ page: 1, perPage: 1 });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      type: 'image',
      value: {
        source: 'unsplash',
        id: 'p1',
        url: 'https://img/regular',
        thumbUrl: 'https://img/small',
        authorName: 'Alice',
        authorUrl: 'https://unsplash.com/@alice',
      },
    });
  });
});

