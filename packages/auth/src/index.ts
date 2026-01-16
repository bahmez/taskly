/**
 * Firebase Authentication Package
 *
 * Provides NestJS guards and decorators for Firebase-based authentication.
 *
 * Exports:
 * - FirebaseAuthGuard: Guard to verify Firebase JWT tokens
 * - CurrentUser: Parameter decorator to inject current user into endpoints
 * - AuthenticatedRequest: Type for requests with attached Firebase user
 *
 * Usage:
 * ```typescript
 * @UseGuards(FirebaseAuthGuard)
 * @Get('/protected')
 * protected(@CurrentUser() user: FirebaseUser) {
 *   return user;
 * }
 * ```
 */

export { FirebaseAuthGuard } from './firebase-auth.guard';
export { CurrentUser } from './auth.decorator';
export type { AuthenticatedRequest } from './auth.types';


