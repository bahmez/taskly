import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center p-6">
      {children}
    </div>
  );
}


