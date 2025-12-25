'use client';

import type { ReactNode } from 'react';
import TrelloLayout from '@/components/layout/trello-layout';
import { RequireAuth } from '@/auth/require-auth';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TrelloLayout>{children}</TrelloLayout>
    </RequireAuth>
  );
}


