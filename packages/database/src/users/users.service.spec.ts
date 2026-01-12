import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { UserModel } from './user.model';
import { UsersService } from './users.service';
import type { UsersStore } from './users.store';

describe('UsersService', () => {
  const store = {
    getById: vi.fn(),
    upsert: vi.fn(),
    searchByPrefix: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } satisfies Partial<UsersStore>;

  let service: UsersService;

  beforeEach(() => {
    store.getById.mockReset();
    store.upsert.mockReset();
    service = new UsersService(store as unknown as UsersStore);
  });

  it('ensureUserExists returns existing user and does not upsert', async () => {
    const existing = { id: 'u1', username: 'x' } as unknown as UserModel;
    store.getById.mockResolvedValueOnce(existing);

    await expect(service.ensureUserExists({ uid: 'u1', email: 'a@b.com', name: 'Alice Doe' })).resolves.toBe(
      existing,
    );
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('ensureUserExists derives username from email prefix', async () => {
    store.getById.mockResolvedValueOnce(null);
    store.upsert.mockImplementationOnce(async (input) => ({ ...input, createdAt: 'x', updatedAt: 'x' } as unknown as UserModel));

    await service.ensureUserExists({ uid: 'u1', email: 'Alice@Example.com', name: 'Alice Doe' });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u1',
        username: 'alice',
        first_name: 'Alice',
        last_name: 'Doe',
        description: '',
      }),
    );
  });

  it('ensureUserExists derives username from name when email is missing', async () => {
    store.getById.mockResolvedValueOnce(null);
    store.upsert.mockImplementationOnce(async (input) => ({ ...input, createdAt: 'x', updatedAt: 'x' } as unknown as UserModel));

    await service.ensureUserExists({ uid: 'u1', name: 'John   Smith' });
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'john.smith',
      }),
    );
  });

  it('ensureUserExists falls back to uid prefix when email and name are missing', async () => {
    store.getById.mockResolvedValueOnce(null);
    store.upsert.mockImplementationOnce(async (input) => ({ ...input, createdAt: 'x', updatedAt: 'x' } as unknown as UserModel));

    await service.ensureUserExists({ uid: 'abc123456789' });
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'abc123456789',
      }),
    );
  });
});


