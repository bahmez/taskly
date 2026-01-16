/**
 * Design System Page Layout
 *
 * Wraps the design system showcase page with WorkspaceUIProvider
 * to demonstrate components in a realistic context.
 */

'use client';

import type { ReactNode } from 'react';
import { WorkspaceUIProvider } from '@/components/workspace/workspace-ui-provider';

/**
 * Layout for the design system page.
 * Provides workspace context for component demonstrations.
 *
 * @param props - Layout props
 * @param props.children - Design system showcase content
 */
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return <WorkspaceUIProvider>{children}</WorkspaceUIProvider>;
}


