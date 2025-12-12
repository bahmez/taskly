'use client';

import { api } from './trpc';

export default function HomePage() {
  const hello = api.hello.useQuery({ text: 'Taskly' });

  return (
    <main>
      <h1>Taskly</h1>
      <p>Monorepo Turborepo · NestJS · NextJS · tRPC</p>

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


