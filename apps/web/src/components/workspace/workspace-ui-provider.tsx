/**
 * Workspace UI Context Provider
 *
 * Manages global workspace selection and list state.
 * Automatically selects the first workspace if none is selected.
 * Auto-updates selection if selected workspace is deleted.
 *
 * Provides:
 * - List of user's workspaces
 * - Currently selected workspace ID
 * - Method to change selected workspace
 * - Loading state
 *
 * Used by Sidebar, Navbar, and other workspace-aware components.
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/app/trpc';

/**
 * Shape of the workspace UI context value.
 */
type WorkspaceUIContextValue = {
  /** Array of user's accessible workspaces */
  workspaces: Array<{ id: string; title: string; description: string }>;
  /** ID of currently selected workspace, or null if none */
  selectedWorkspaceId: string | null;
  /** Function to change selected workspace */
  setSelectedWorkspaceId: (id: string | null) => void;
  /** True while workspace list is loading from API */
  isLoading: boolean;
};

/** React Context for workspace UI state */
const WorkspaceUIContext = createContext<WorkspaceUIContextValue | null>(null);

/**
 * Workspace UI Provider Component
 *
 * Fetches list of workspaces and manages selection state.
 * Auto-selects first workspace if none is selected.
 * Handles edge cases (deleted workspace, empty list, etc.).
 *
 * @param props - Component props
 * @param props.children - Components to wrap with workspace context
 *
 * @example
 * ```tsx
 * <WorkspaceUIProvider>
 *   <Sidebar />
 *   <Navbar />
 * </WorkspaceUIProvider>
 * ```
 */
export function WorkspaceUIProvider({ children }: { children: React.ReactNode }) {
  // Fetch user's non-archived workspaces from API
  const workspacesQuery = api.workspaces.list.useQuery({ archived: false });
  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Auto-select first workspace or handle list changes
  useEffect(() => {
    if (!workspaces.length) {
      // No workspaces available: clear selection
      if (selectedWorkspaceId !== null) setSelectedWorkspaceId(null);
      return;
    }
    if (!selectedWorkspaceId) {
      // No selection yet: select first workspace
      setSelectedWorkspaceId(workspaces[0]!.id);
      return;
    }
    // Check if selected workspace still exists
    if (!workspaces.some((w) => w.id === selectedWorkspaceId)) {
      // Selected workspace was deleted: select first available
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

/**
 * Hook to access workspace UI context.
 *
 * Provides access to workspace list and selection state.
 * Must be used within a <WorkspaceUIProvider> component.
 *
 * @returns Workspace UI context value
 * @throws Error if used outside <WorkspaceUIProvider>
 *
 * @example
 * ```tsx
 * export function MyComponent() {
 *   const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceUI();
 *   // ... use the values
 * }
 * ```
 */
export function useWorkspaceUI() {
  const ctx = useContext(WorkspaceUIContext);
  if (!ctx) throw new Error('useWorkspaceUI must be used within <WorkspaceUIProvider>');
  return ctx;
}


