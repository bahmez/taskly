'use client';

import type { ReactNode } from 'react';
import { WorkspaceUIProvider } from '@/components/workspace/workspace-ui-provider';

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return <WorkspaceUIProvider>{children}</WorkspaceUIProvider>;
}


