'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, useToast } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';
import { useTranslation } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, registerWithEmailPassword } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast({
        title: 'Password',
        description: 'Passwords do not match.',
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
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <Card className="w-full max-w-md shadow-xl border-[#9fadbc29] bg-[#1d2125] text-[#b6c2cf]">
      <CardHeader>
        <CardTitle className="text-[#b6c2cf]">{t('auth.register_title')}</CardTitle>
        <CardDescription className="text-[#9fadbc]">{t('auth.register_description')}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#9fadbc]" htmlFor="email">
              {t('auth.email_label')}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              className="bg-[#22272b] border-[#9fadbc29] text-[#b6c2cf] placeholder:text-[#9fadbc]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#9fadbc]" htmlFor="password">
              {t('auth.password_label')}
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
              {t('auth.password_confirm_label')}
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
            {submitting ? t('auth.sign_up_loading') : t('auth.sign_up')}
          </Button>
          <p className="text-sm text-[#9fadbc]">
            {t('auth.have_account')}{' '}
            <Link className="text-[#85b8ff] hover:underline" href="/login">
              {t('auth.login_link')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
