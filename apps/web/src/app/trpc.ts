/**
 * tRPC React Client
 *
 * Typed tRPC client configured for the Taskly API.
 * Provides end-to-end type safety for frontend-backend communication.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = api.users.getById.useQuery('userId');
 * await api.workspaces.createWorkspace.useMutation();
 * ```
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@taskly/trpc';

/**
 * Typed tRPC React client instance.
 * Configured with the AppRouter type from @taskly/trpc.
 *
 * Provides hooks for queries, mutations, and subscriptions
 * with full TypeScript support.
 */
export const api = createTRPCReact<AppRouter>();


