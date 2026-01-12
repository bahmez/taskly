import { NotFoundException } from '@nestjs/common';
import type { UserModel, UsersService, UserUpdateInput } from '@taskly/database';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserController } from './user.controller.js';

describe('UserController', () => {
  const users = {
    search: vi.fn(),
    getById: vi.fn(),
    updateMe: vi.fn(),
    deleteMe: vi.fn(),
  } satisfies Pick<UsersService, 'search' | 'getById' | 'updateMe' | 'deleteMe'>;

  let controller: UserController;

  beforeEach(() => {
    users.search.mockReset();
    users.getById.mockReset();
    users.updateMe.mockReset();
    users.deleteMe.mockReset();
    controller = new UserController(users as unknown as UsersService);
  });

  it('me returns current user', () => {
    const user = { id: 'u1' } as unknown as UserModel;
    expect(controller.me(user)).toBe(user);
  });

  it('search caps limit to [1..30] and defaults to 10 on invalid', async () => {
    users.search.mockResolvedValueOnce([{ id: 'u1' }]);
    await controller.search('john', '999');
    expect(users.search).toHaveBeenCalledWith('john', 30);

    users.search.mockResolvedValueOnce([{ id: 'u1' }]);
    await controller.search('john', '0');
    expect(users.search).toHaveBeenCalledWith('john', 1);

    users.search.mockResolvedValueOnce([{ id: 'u1' }]);
    await controller.search('john', 'nope');
    expect(users.search).toHaveBeenCalledWith('john', 10);
  });

  it('getById throws when user is not found', async () => {
    users.getById.mockResolvedValueOnce(null);
    await expect(controller.getById('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateMe forwards a safe patch to users.updateMe', async () => {
    const current = { id: 'u1' } as unknown as UserModel;
    const body: UserUpdateInput = {
      username: 'alice',
      first_name: 'Alice',
      last_name: 'Doe',
      description: 'Hi',
    };

    users.updateMe.mockResolvedValueOnce({ ok: true });
    await controller.updateMe(current, body);

    expect(users.updateMe).toHaveBeenCalledWith('u1', {
      username: 'alice',
      first_name: 'Alice',
      last_name: 'Doe',
      description: 'Hi',
    });
  });

  it('deleteMe calls users.deleteMe and returns { ok: true }', async () => {
    const current = { id: 'u1' } as unknown as UserModel;
    users.deleteMe.mockResolvedValueOnce(undefined);
    await expect(controller.deleteMe(current)).resolves.toEqual({ ok: true });
    expect(users.deleteMe).toHaveBeenCalledWith('u1');
  });
});


