'use client';

import type { ReactNode } from 'react';
import TrelloLayout from '@/components/layout/trello-layout';
import { RequireAuth } from '@/auth/require-auth';
import { WorkspaceUIProvider } from '@/components/workspace/workspace-ui-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <WorkspaceUIProvider>
        <TrelloLayout>{children}</TrelloLayout>
      </WorkspaceUIProvider>
    </RequireAuth>
  );
}


