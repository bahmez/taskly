/**
 * Root Layout Component
 *
 * Entry point for all pages in the application.
 * Wraps the entire app with global providers (tRPC, Auth, Toaster).
 * Sets up HTML structure and global styles.
 *
 * Supports multi-language (FR, EN) with i18n.
 */

import './globals.css';
import { Providers } from './providers';
import { RootLayoutClient } from './layout-client';
import type { ReactNode } from 'react';

/**
 * Root layout for the entire application.
 * All pages and nested layouts render as children of this component.
 *
 * @param props - Layout props
 * @param props.children - Page content to render
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <RootLayoutClient>
      <Providers>{children}</Providers>
    </RootLayoutClient>
  );
}


