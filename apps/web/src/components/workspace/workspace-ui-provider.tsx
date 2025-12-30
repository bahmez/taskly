'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/app/trpc';

type WorkspaceUIContextValue = {
  workspaces: Array<{ id: string; title: string; description: string }>;
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  isLoading: boolean;
};

const WorkspaceUIContext = createContext<WorkspaceUIContextValue | null>(null);

export function WorkspaceUIProvider({ children }: { children: React.ReactNode }) {
  const workspacesQuery = api.workspaces.list.useQuery({ archived: false });
  const workspaces = workspacesQuery.data ?? [];

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaces.length) {
      if (selectedWorkspaceId !== null) setSelectedWorkspaceId(null);
      return;
    }
    if (!selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0]!.id);
      return;
    }
    if (!workspaces.some((w) => w.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(workspaces[0]!.id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const value = useMemo<WorkspaceUIContextValue>(
    () => ({
      workspaces: workspaces.map((w) => ({ id: w.id, title: w.title, description: w.description })),
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      isLoading: workspacesQuery.isLoading,
    }),
    [workspaces, selectedWorkspaceId, workspacesQuery.isLoading],
  );

  return <WorkspaceUIContext.Provider value={value}>{children}</WorkspaceUIContext.Provider>;
}

export function useWorkspaceUI() {
  const ctx = useContext(WorkspaceUIContext);
  if (!ctx) throw new Error('useWorkspaceUI must be used within <WorkspaceUIProvider>');
  return ctx;
}


