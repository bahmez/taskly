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

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    try {
      const decoded = await this.auth.verifyIdToken(token);
      const user = await this.users.ensureUserExists(decoded);

      (req as unknown as Request & Partial<AuthenticatedRequest>).firebase = {
        token: decoded,
      };
      (req as unknown as Request & Partial<AuthenticatedRequest>).user = user;
      return true;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        const err = e as { message?: string; code?: string };
        // eslint-disable-next-line no-console
        console.warn('[auth] verifyIdToken failed', { code: err?.code, message: err?.message });
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}


