/**
 * Public Home Page
 *
 * Landing page for unauthenticated users.
 * Shows Taskly branding and tRPC test.
 * Provides navigation to login/register or dashboard.
 *
 * Display logic:
 * - Loading: Show nothing
 * - Not authenticated: Show Login/Register buttons
 * - Authenticated: Show Dashboard/Logout buttons
 * - Always: Show tRPC test panel for debugging
 */

'use client';

import { api } from './trpc';
import Link from 'next/link';
import { Button } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

/**
 * Home page component.
 * Entry point for new users to the application.
 *
 * @returns Landing page with auth-based navigation
 */
export default function HomePage() {
  // Test tRPC connection to API
  const hello = api.hello.useQuery({ text: 'Taskly' });
  // Get auth state to show appropriate buttons
  const { user, loading, logout } = useAuth();

  return (
    <main>
      <h1>Taskly</h1>
      <p>Monorepo Turborepo · NestJS · NextJS · tRPC</p>

      {/* Auth-based navigation buttons */}
      <div className="mt-4 flex gap-2 items-center">
        {/* Unauthenticated: Show login/register */}
        {!loading && !user && (
          <>
            <Button asChild variant="trello">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="trelloGray">
              <Link href="/register">Register</Link>
            </Button>
          </>
        )}

        {/* Authenticated: Show dashboard/logout */}
        {!loading && user && (
          <>
            <Button asChild variant="trello">
              <Link href="/dashboard">Aller au dashboard</Link>
            </Button>
            <Button variant="outline" onClick={() => logout()}>
              Logout
            </Button>
          </>
        )}
      </div>

      {/* tRPC connection test panel */}
      <div className="card">
        <h2>Test tRPC</h2>
        {hello.isLoading && <p>Chargement…</p>}
        {hello.error && (
          <p>
            Erreur: <code>{hello.error.message}</code>
          </p>
        )}
        {hello.data && (
          <p>
            Réponse API: <strong>{hello.data.message}</strong>
          </p>
        )}
        <p>
          API attendue sur <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}</code>
        </p>
      </div>
    </main>
  );
}


