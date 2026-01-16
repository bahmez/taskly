/**
 * tRPC Provider Configuration
 *
 * Sets up tRPC client with:
 * - HTTP batch link for efficient request batching
 * - Firebase JWT authentication via Authorization header
 * - SuperJSON transformer for complex type serialization
 * - React Query integration for state management
 *
 * Automatically injects Firebase ID token into all tRPC requests.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { useState } from 'react';
import { api } from './trpc';
import { getFirebaseAuth } from '@/lib/firebase/firebase-client';

/**
 * Gets the base URL for tRPC API calls.
 * Respects NEXT_PUBLIC_API_URL environment variable.
 *
 * @returns API base URL (e.g., 'http://localhost:4000')
 */
function getBaseUrl() {
  // Browser -> use env public variable
  if (typeof window !== 'undefined') return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  // SSR (not needed for this MVP)
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

/**
 * tRPC Provider Component
 *
 * Configures the tRPC client with authentication and sets up React Query.
 * Automatically attaches Firebase ID tokens to all requests.
 *
 * @param props - Component props
 * @param props.children - Components to provide tRPC context to
 *
 * @example
 * ```tsx
 * // In root layout
 * <Providers>
 *   <TRPCProvider>
 *     <App />
 *   </TRPCProvider>
 * </Providers>
 * ```
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // Initialize React Query client (persistent across renders)
  const [queryClient] = useState(() => new QueryClient());

  // Initialize tRPC client with HTTP batch link and auth headers
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          // URL to the tRPC endpoint on the API server
          url: `${getBaseUrl()}/trpc`,
          // Transformer for serializing complex types (Date, Map, Set, etc.)
          transformer: superjson,
          // Dynamically add Firebase JWT to Authorization header
          headers: async () => {
            const auth = getFirebaseAuth();
            const token = await auth?.currentUser?.getIdToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}


