/**
 * Root Layout Component
 *
 * Entry point for all pages in the application.
 * Wraps the entire app with global providers (tRPC, Auth, Toaster).
 * Sets up HTML structure and global styles.
 *
 * Language: French (lang="fr")
 */

import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

/**
 * Root layout for the entire application.
 * All pages and nested layouts render as children of this component.
 *
 * @param props - Layout props
 * @param props.children - Page content to render
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Global providers: tRPC, Auth, Toaster */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


