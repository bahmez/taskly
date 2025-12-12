import type { ReactNode } from 'react';
import './globals.css';
import { TRPCProvider } from './trpc-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}


