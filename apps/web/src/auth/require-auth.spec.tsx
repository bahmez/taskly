import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RequireAuth } from './require-auth';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard',
}));

const useAuthMock = vi.fn();
vi.mock('./auth-provider', () => ({
  useAuth: () => useAuthMock(),
}));

describe('RequireAuth', () => {
  beforeEach(() => {
    replace.mockReset();
    useAuthMock.mockReset();
  });

  it('renders children when user is present', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, loading: false });
    render(<RequireAuth><div>OK</div></RequireAuth>);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to login when not loading and no user', async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<RequireAuth><div>OK</div></RequireAuth>);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?next=%2Fdashboard');
    });
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('does not redirect while loading', async () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    render(<RequireAuth><div>OK</div></RequireAuth>);

    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });
});


