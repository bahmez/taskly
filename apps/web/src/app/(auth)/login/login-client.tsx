'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, useToast } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function LoginClient({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, signInWithEmailPassword } = useAuth();

  const redirectTo = safeDecodeURIComponent(nextPath ?? '/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [loading, user, router, redirectTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmailPassword(email.trim(), password);
      router.replace(redirectTo);
    } catch (err) {
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


