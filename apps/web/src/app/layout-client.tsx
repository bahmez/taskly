/**
 * Root Layout Client Component
 *
 * Client-side wrapper that manages language state and HTML attributes.
 * Separated from the server layout to enable dynamic language switching.
 */

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage, LanguageProvider } from '@/lib/i18n';

function RootLayoutClientInner({ children }: { children: ReactNode }) {
  const { language, mounted } = useLanguage();
  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);
  }, []);

  useEffect(() => {
    if (mounted && domReady) {
      document.documentElement.lang = language;
    }
  }, [language, mounted, domReady]);

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        {/* Global providers wrapped by server component */}
        {children}
      </body>
    </html>
  );
}

export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <RootLayoutClientInner>{children}</RootLayoutClientInner>
    </LanguageProvider>
  );
}
