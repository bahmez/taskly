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
import { Github } from 'lucide-react';
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.3 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.3l8.1 6.3C12.6 13.1 17.9 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.7-.2-3.4-.5-5H24v9.5h12.5c-.5 2.7-2.1 5-4.5 6.5l7 5.4c4.1-3.8 6.1-9.4 6.1-16.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.7 28.6c-1-2.9-1-6 0-8.9l-8.1-6.3C-.1 17.5-.1 30.5 2.6 34.6l8.1-6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 12-2.1 16-5.7l-7-5.4c-2 1.4-4.5 2.3-9 2.3-6.1 0-11.4-3.9-13.3-9.4l-8.1 6C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
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
  const { user, loading, signInWithEmailPassword, signInWithGithub, signInWithGoogle } = useAuth();

  // Safely decode the next path or default to dashboard
  const redirectTo = safeDecodeURIComponent(nextPath ?? '/dashboard');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState<'google' | 'github' | null>(null);

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

  async function onOAuthSignIn(provider: 'google' | 'github') {
    setOauthSubmitting(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      router.replace(redirectTo);
    } catch (err) {
      toast({
        title: 'Connexion impossible',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setOauthSubmitting(null);
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
            <Button
              type="button"
              variant="trelloGray"
              onClick={() => onOAuthSignIn('google')}
              disabled={submitting || oauthSubmitting !== null}
              className="w-full justify-center gap-2"
            >
              <GoogleIcon className="h-4 w-4" />
              {oauthSubmitting === 'google' ? 'Connexion Google…' : 'Continuer avec Google'}
            </Button>
            <Button
              type="button"
              variant="trelloGray"
              onClick={() => onOAuthSignIn('github')}
              disabled={submitting || oauthSubmitting !== null}
              className="w-full justify-center gap-2"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              {oauthSubmitting === 'github' ? 'Connexion GitHub…' : 'Continuer avec GitHub'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[#9fadbc29]" />
            <span className="text-xs uppercase tracking-wide text-[#9fadbc]">ou</span>
            <span className="h-px flex-1 bg-[#9fadbc29]" />
          </div>
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
          <Button type="submit" variant="trello" disabled={submitting || oauthSubmitting !== null}>
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


