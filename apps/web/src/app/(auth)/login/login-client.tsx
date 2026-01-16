/**
 * Login Page Client Component
 *
 * Handles user sign in with email and password via Firebase Auth.
 * Auto-redirects authenticated users to dashboard or return URL.
 * Shows error toast on login failure.
 *
 * Features:
 * - Email/password form
 * - Form validation
 * - Error handling with toasts
 * - Redirect after successful login
 * - Link to registration page
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, useToast } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

/**
 * Safely decodes URI component, returning original value on error.
 * Used to safely handle next URL parameter.
 * 
 * @param value - Encoded URL string
 * @returns Decoded value or original if decode fails
 */
function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Login form component.
 * Displays email/password form and handles authentication.
 *
 * @param props - Component props
 * @param props.nextPath - URL-encoded path to redirect after login (default: /dashboard)
 */
export function LoginClient({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, signInWithEmailPassword } = useAuth();

  // Safely decode the next path or default to dashboard
  const redirectTo = safeDecodeURIComponent(nextPath ?? '/dashboard');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [loading, user, router, redirectTo]);

  /**
   * Handles form submission - authenticates user and redirects.
   */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Attempt Firebase sign in
      await signInWithEmailPassword(email.trim(), password);
      // Redirect to dashboard or intended page
      router.replace(redirectTo);
    } catch (err) {
      // Show error toast on authentication failure
      toast({
        title: 'Connexion impossible',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-[#9fadbc29] bg-[#1d2125] text-[#b6c2cf]">
      <CardHeader>
        <CardTitle className="text-[#b6c2cf]">Connexion</CardTitle>
        <CardDescription className="text-[#9fadbc]">Connecte-toi avec ton email et ton mot de passe.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#9fadbc]" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] placeholder:text-[#9fadbc]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#9fadbc]" htmlFor="password">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] placeholder:text-[#9fadbc]"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-stretch">
          <Button type="submit" variant="trello" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
          <p className="text-sm text-[#9fadbc]">
            Pas de compte ?{' '}
            <Link className="text-[#85b8ff] hover:underline" href="/register">
              Créer un compte
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}


