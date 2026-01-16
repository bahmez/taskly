/**
 * Authentication Guard Component
 *
 * Protects components by requiring an authenticated user.
 * Redirects unauthenticated users to the login page with a return URL.
 *
 * Shows nothing (null) while auth state is loading or user is not authenticated.
 * Once user is verified, renders children.
 *
 * @example
 * ```tsx
 * // In a layout or page
 * export default function ProtectedPage() {
 *   return (
 *     <RequireAuth>
 *       <YourProtectedContent />
 *     </RequireAuth>
 *   );
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

/**
 * Component that requires authentication to render children.
 *
 * Behavior:
 * - Loading state: renders nothing
 * - Unauthenticated: redirects to /login with `next` query param for post-login redirect
 * - Authenticated: renders children
 *
 * @param props - Component props
 * @param props.children - Content to render if user is authenticated
 * @returns Children if authenticated, null if loading or unauthenticated (which triggers redirect)
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if auth is done loading and user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      // Preserve current URL to redirect after login
      const next = encodeURIComponent(pathname ?? '/');
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  // Don't render anything while loading or if user is not authenticated
  // (redirect will happen via useEffect)
  if (loading) return null;
  if (!user) return null;
  return children;
}


