import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/layout/sidebar';

const mockPush = vi.fn();
let mockPathname = '/dashboard/boards/board-1';
let workspaceState = {
  workspaces: [
    { id: 'w1', title: 'Workspace A', description: '' },
    { id: 'w2', title: 'Workspace B', description: '' },
  ],
  selectedWorkspaceId: 'w1' as string | null,
  setSelectedWorkspaceId: vi.fn(),
  isLoading: false,
};

const mockInvalidate = vi.fn();
const mockMutate = vi.fn();
const mockUseQuery = vi.fn(() => ({ data: [] }));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', async () => {
  const React = await import('react');
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) =>
      React.createElement('a', { href }, children),
  };
});

vi.mock('@/components/workspace/workspace-ui-provider', () => ({
  useWorkspaceUI: () => workspaceState,
}));

vi.mock('@/app/trpc', () => ({
  api: {
    useUtils: () => ({
      workspaces: {
        boards: {
          list: { invalidate: mockInvalidate },
        },
      },
    }),
    workspaces: {
      boards: {
        list: {
          useQuery: vi.fn(() => mockUseQuery()),
        },
        create: {
          useMutation: () => ({ mutate: mockMutate, isPending: false }),
        },
      },
    },
  },
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockPush.mockClear();
    workspaceState = {
      workspaces: [
        { id: 'w1', title: 'Workspace A', description: '' },
        { id: 'w2', title: 'Workspace B', description: '' },
      ],
      selectedWorkspaceId: 'w1',
      setSelectedWorkspaceId: vi.fn(),
      isLoading: false,
    };
    mockPathname = '/dashboard/boards/board-1';
  });

  it('shows workspace navigation when not collapsed', () => {
    render(<Sidebar />);

    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText(/Your boards/i)).toBeInTheDocument();
  });

  it('hides labels when collapsed', () => {
    render(<Sidebar isCollapsed />);

    expect(screen.queryByText('Boards')).not.toBeInTheDocument();
    expect(screen.queryByText(/Your boards/i)).not.toBeInTheDocument();
  });

  it('navigates to the selected workspace', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: /workspace b/i }));

    expect(workspaceState.setSelectedWorkspaceId).toHaveBeenCalledWith('w2');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/workspaces/w2');
  });

  it('disables board creation when no workspace is selected', () => {
    workspaceState = {
      ...workspaceState,
      selectedWorkspaceId: null,
    };

    render(<Sidebar />);

    expect(screen.getByTitle('Select a workspace first')).toBeDisabled();
  });
});
