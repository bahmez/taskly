/**
 * Firebase Authentication Guard
 *
 * NestJS guard that verifies Firebase JWT tokens from request Authorization header.
 * Automatically creates/updates user in database and attaches user and token to request.
 *
 * Usage:
 * ```typescript
 * @UseGuards(FirebaseAuthGuard)
 * @Get('/protected')
 * protected(@CurrentUser() user: UserModel) {
 *   return user;
 * }
 * ```
 */

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '@taskly/firebase';
import { UsersService } from '@taskly/database';
import type { AuthenticatedRequest } from './auth.types';

/**
 * Extracts Bearer token from Authorization header.
 * Validates header format: 'Bearer <token>'
 *
 * @param req - Express request object
 * @returns JWT token or null if missing or malformed
 */
function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Firebase Authentication Guard
 *
 * Verifies Firebase ID tokens and attaches authenticated user to request.
 * Implements NestJS CanActivate interface for use with @UseGuards() decorator.
 *
 * Process:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token with Firebase Admin SDK
 * 3. Ensure user exists in database (create if new)
 * 4. Attach firebase token and user object to request
 * 5. Return true to allow route handler to execute
 *
 * Throws UnauthorizedException if token is missing, invalid, or expired.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  /**
   * Determines if the request is authorized.
   *
   * @param context - NestJS execution context
   * @returns true if authorization succeeds
   * @throws UnauthorizedException if token is missing or invalid
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    try {
      // Verify Firebase JWT token
      const decoded = await this.auth.verifyIdToken(token);
      // Ensure user exists in database (create if new)
      const user = await this.users.ensureUserExists(decoded);

      // Attach verified token and user to request for later use
      (req as unknown as Request & Partial<AuthenticatedRequest>).firebase = {
        token: decoded,
      };
      (req as unknown as Request & Partial<AuthenticatedRequest>).user = user;
      return true;
    } catch (e) {
      // Log errors in development for debugging
      if (process.env.NODE_ENV !== 'production') {
        const err = e as { message?: string; code?: string };
        // eslint-disable-next-line no-console
        console.warn('[auth] verifyIdToken failed', { code: err?.code, message: err?.message });
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}


