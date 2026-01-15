import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { UsersService } from '@taskly/database';
import { describe, expect, it, vi } from 'vitest';
import { FirebaseAuthGuard } from './firebase-auth.guard';

function makeCtx(req: Request): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('FirebaseAuthGuard', () => {
  // Keep behavior consistent with the guard's dev logging behavior.
  // (We don't assert logs, but we avoid accidental prod-only branches.)
  process.env.NODE_ENV ??= 'test';

  it('throws UnauthorizedException when Bearer token is missing', async () => {
    const auth = { verifyIdToken: vi.fn() } satisfies Pick<Auth, 'verifyIdToken'>;
    const users = { ensureUserExists: vi.fn() } satisfies Pick<UsersService, 'ensureUserExists'>;
    const guard = new FirebaseAuthGuard(auth as unknown as Auth, users as unknown as UsersService);

    const req = { headers: {} } as unknown as Request;
    await expect(guard.canActivate(makeCtx(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is invalid', async () => {
    const auth = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error('bad token')),
    } satisfies Pick<Auth, 'verifyIdToken'>;
    const users = { ensureUserExists: vi.fn() } satisfies Pick<UsersService, 'ensureUserExists'>;
    const guard = new FirebaseAuthGuard(auth as unknown as Auth, users as unknown as UsersService);

    const req = { headers: { authorization: 'Bearer bad' } } as unknown as Request;
    await expect(guard.canActivate(makeCtx(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sets req.user and req.firebase.token on success', async () => {
    const decoded = { uid: 'u1' } as unknown as DecodedIdToken;
    const user = { id: 'u1' };

    const auth = {
      verifyIdToken: vi.fn().mockResolvedValue(decoded),
    } satisfies Pick<Auth, 'verifyIdToken'>;
    const users = {
      ensureUserExists: vi.fn().mockResolvedValue(user),
    } satisfies Pick<UsersService, 'ensureUserExists'>;

    const guard = new FirebaseAuthGuard(auth as unknown as Auth, users as unknown as UsersService);

    const req = { headers: { authorization: 'Bearer ok' } } as unknown as Request & Record<string, unknown>;
    await expect(guard.canActivate(makeCtx(req as unknown as Request))).resolves.toBe(true);

    expect((req as { user?: unknown }).user).toEqual(user);
    expect((req as { firebase?: { token?: unknown } }).firebase?.token).toEqual(decoded);
  });
});


