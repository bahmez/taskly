/**
 * Current User Parameter Decorator
 *
 * Injects the authenticated user from the request into endpoint parameters.
 * Must be used within a handler protected by FirebaseAuthGuard.
 *
 * Usage:
 * ```typescript
 * @UseGuards(FirebaseAuthGuard)
 * @Get('/profile')
 * getProfile(@CurrentUser() user: UserModel) {
 *   return user;
 * }
 * ```
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequest } from './auth.types';

/**
 * Parameter decorator to extract current authenticated user from request.
 * Retrieves the user object attached by FirebaseAuthGuard.
 *
 * @returns The authenticated UserModel from the request
 * @throws undefined if no user is attached (should not happen if guard is applied)
 *
 * @example
 * ```typescript
 * @Get('/me')
 * @UseGuards(FirebaseAuthGuard)
 * me(@CurrentUser() user: UserModel) {
 *   return { id: user.id, username: user.username };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    return req.user;
  },
);


