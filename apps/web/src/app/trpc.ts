import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@taskly/trpc';

export const api = createTRPCReact<AppRouter>();


