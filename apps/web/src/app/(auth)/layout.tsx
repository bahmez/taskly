'use client';

import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center p-6 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}


