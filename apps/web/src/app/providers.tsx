/**
 * Application Providers Wrapper
 *
 * Combines all essential React Context providers into a single component.
 * Must be placed in the root layout to enable tRPC, authentication, and notifications.
 *
 * Provider hierarchy (outer to inner):
 * 1. TRPCProvider: Backend API communication
 * 2. AuthProvider: User authentication state
 * 3. Toaster: Global notifications/toast container
 */

'use client';

import { Toaster } from '@taskly/ui';
import { AuthProvider } from '@/auth/auth-provider';
import { TRPCProvider } from './trpc-provider';

/**
 * Root providers component.
 *
 * Wraps children with all necessary providers for the application to function.
 * Place this in the root layout wrapper element.
 *
 * @param props - Component props
 * @param props.children - Application components to wrap
 *
 * @example
 * ```tsx
 * // In root layout
 * export default function RootLayout() {
 *   return (
 *     <Providers>
 *       <AppContent />
 *     </Providers>
 *   );
 * }
 * ```
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>
        {children}
        {/* Global toast notifications container */}
        <Toaster />
      </AuthProvider>
    </TRPCProvider>
  );
}


