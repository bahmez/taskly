/**
 * Firebase Authentication Context Provider
 *
 * Provides authentication state and operations to the entire application.
 * Manages:
 * - Current user state (Firebase User object)
 * - Loading state during auth state initialization
 * - Sign in, registration, and logout operations
 *
 * Must wrap the entire app (typically in root layout).
 * Use the `useAuth()` hook to access auth context anywhere in the component tree.
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/firebase-client';

/**
 * Shape of the authentication context value.
 * Contains user state, loading flag, and auth operations.
 */
type AuthContextValue = {
  /** Current authenticated user from Firebase, or null if not logged in */
  user: User | null;
  /** True while initial auth state is being loaded */
  loading: boolean;
  /** Sign in with email and password */
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  /** Register new user with email and password */
  registerWithEmailPassword: (email: string, password: string) => Promise<void>;
  /** Sign out current user */
  logout: () => Promise<void>;
};

/** React Context for authentication state */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Authentication Provider Component
 *
 * Initializes Firebase auth listener on mount and provides auth context to children.
 * Handles the initial auth state resolution for hydration.
 *
 * @param props - Component props
 * @param props.children - Components to wrap with auth context
 *
 * @example
 * ```tsx
 * // In root layout
 * export default function RootLayout() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state changes on mount
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    // Listen for auth state changes (fires immediately with current state)
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Cleanup: unsubscribe on unmount
    return () => unsub();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      /**
       * Sign in existing user with email and password.
       * @throws Error if Firebase Auth is not configured
       */
      signInWithEmailPassword: async (email, password) => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth n'est pas configuré (env manquantes).");
        await signInWithEmailAndPassword(auth, email, password);
      },
      /**
       * Register new user with email and password.
       * @throws Error if Firebase Auth is not configured
       */
      registerWithEmailPassword: async (email, password) => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth n'est pas configuré (env manquantes).");
        await createUserWithEmailAndPassword(auth, email, password);
      },
      /**
       * Sign out current user.
       * Does nothing if Firebase Auth is not configured.
       */
      logout: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context.
 *
 * Provides access to current user, loading state, and auth operations.
 * Must be used within an <AuthProvider> component.
 *
 * @returns Authentication context value
 * @throws Error if used outside <AuthProvider>
 *
 * @example
 * ```tsx
 * export function MyComponent() {
 *   const { user, loading, logout } = useAuth();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return <LoginForm />;
 *
 *   return <button onClick={logout}>Logout</button>;
 * }
 * ```
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}


