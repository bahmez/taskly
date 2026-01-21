/**
 * Root Layout Client Component
 *
 * Client-side wrapper that manages language state and HTML attributes.
 * Separated from the server layout to enable dynamic language switching.
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n';

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const { language, mounted } = useLanguage();

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        {/* Global providers wrapped by server component */}
        {children}
      </body>
    </html>
  );
}
