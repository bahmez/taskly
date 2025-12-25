'use client';

import { Toaster } from '@taskly/ui';
import { AuthProvider } from '@/auth/auth-provider';
import { TRPCProvider } from './trpc-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </TRPCProvider>
  );
}


