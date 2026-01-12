import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityLogCreateInput } from './activity-log.model';
import type { ActivityLogsStore } from './activity-logs.store';
import { ActivityLogsService } from './activity-logs.service';

describe('ActivityLogsService', () => {
  const store = {
    create: vi.fn(),
    listForBoard: vi.fn(),
    listForTicket: vi.fn(),
  } satisfies Pick<ActivityLogsStore, 'create' | 'listForBoard' | 'listForTicket'>;

  let service: ActivityLogsService;

  beforeEach(() => {
    store.create.mockReset();
    store.listForBoard.mockReset();
    store.listForTicket.mockReset();
    service = new ActivityLogsService(store as unknown as ActivityLogsStore);
  });

  it('create delegates to store', async () => {
    store.create.mockResolvedValueOnce({ id: 'a1' });
    const input = { type: 'ticket_created' } satisfies ActivityLogCreateInput;
    await expect(service.create('b1', input)).resolves.toEqual({ id: 'a1' });
    expect(store.create).toHaveBeenCalledWith('b1', input);
  });

  it('listForBoard delegates to store', async () => {
    store.listForBoard.mockResolvedValueOnce({ items: [], nextCursor: null });
    await expect(service.listForBoard('b1', { limit: 20 })).resolves.toEqual({ items: [], nextCursor: null });
    expect(store.listForBoard).toHaveBeenCalledWith('b1', { limit: 20 });
  });

  it('listForTicket delegates to store', async () => {
    store.listForTicket.mockResolvedValueOnce({ items: [], nextCursor: null });
    await expect(service.listForTicket('b1', 't1', { limit: 10, cursor: null })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(store.listForTicket).toHaveBeenCalledWith('b1', 't1', { limit: 10, cursor: null });
  });
});

