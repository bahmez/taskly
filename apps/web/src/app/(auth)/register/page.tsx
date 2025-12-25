'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, useToast } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, registerWithEmailPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast({
        title: 'Mot de passe',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmailPassword(email.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      toast({
        title: 'Inscription impossible',
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
        <CardTitle className="text-[#b6c2cf]">Créer un compte</CardTitle>
        <CardDescription className="text-[#9fadbc]">Inscris-toi avec ton email et un mot de passe.</CardDescription>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] placeholder:text-[#9fadbc]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#9fadbc]" htmlFor="password2">
              Confirmer le mot de passe
            </label>
            <Input
              id="password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] placeholder:text-[#9fadbc]"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-stretch">
          <Button type="submit" variant="trello" disabled={submitting}>
            {submitting ? 'Création…' : 'Créer mon compte'}
          </Button>
          <p className="text-sm text-[#9fadbc]">
            Déjà un compte ?{' '}
            <Link className="text-[#85b8ff] hover:underline" href="/login">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}


