'use client';

import { api } from './trpc';
import Link from 'next/link';
import { Button } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

export default function HomePage() {
  const hello = api.hello.useQuery({ text: 'Taskly' });
  const { user, loading, logout } = useAuth();

  return (
    <main>
      <h1>Taskly</h1>
      <p>Monorepo Turborepo · NestJS · NextJS · tRPC</p>

      <div className="mt-4 flex gap-2 items-center">
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


