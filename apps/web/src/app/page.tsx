/**
 * Public Home Page
 *
 * Landing page for unauthenticated users.
 * Shows Taskly branding and supports multi-language.
 * Provides navigation to login/register or dashboard.
 *
 * Display logic:
 * - Loading: Show nothing
 * - Not authenticated: Show Login/Register buttons
 * - Authenticated: Show Dashboard/Logout buttons
 * - Always: Show language switcher
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex flex-col justify-center items-center w-6 h-6 gap-[5px]">
      <span
        className={`block h-[2px] w-5 rounded-full bg-slate-700 transition-all duration-300 ${open ? 'translate-y-[7px] rotate-45' : ''}`}
      />
      <span
        className={`block h-[2px] w-5 rounded-full bg-slate-700 transition-all duration-300 ${open ? 'opacity-0' : ''}`}
      />
      <span
        className={`block h-[2px] w-5 rounded-full bg-slate-700 transition-all duration-300 ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
      />
    </div>
  );
}

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAuthButtons = !loading && !user;
  const showDashboardButtons = !loading && user;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = t('landing.features') as Array<{ title: string; description: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps = t('landing.steps') as Array<{ title: string; description: string }>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-10">
        <header className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c66e4] text-white font-semibold">
                T
              </div>
              <span className="text-lg font-semibold text-slate-900">Taskly</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-3">
              <LanguageSwitcher />
              <div className="flex items-center gap-2">
                {showAuthButtons && (
                  <>
                    <Button asChild variant="trelloGray" size="sm">
                      <Link href="/login">{t('header.login_button')}</Link>
                    </Button>
                    <Button asChild variant="trello" size="sm">
                      <Link href="/register">{t('header.register_button')}</Link>
                    </Button>
                  </>
                )}
                {showDashboardButtons && (
                  <>
                    <Button asChild variant="trello" size="sm">
                      <Link href="/dashboard">{t('header.dashboard_button')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logout()}>
                      {t('header.logout_button')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Burger button (mobile only) */}
            <button
              type="button"
              className="sm:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <BurgerIcon open={mobileMenuOpen} />
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <LanguageSwitcher />
              {showAuthButtons && (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="trelloGray" className="w-full justify-center">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>{t('header.login_button')}</Link>
                  </Button>
                  <Button asChild variant="trello" className="w-full justify-center">
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>{t('header.register_button')}</Link>
                  </Button>
                </div>
              )}
              {showDashboardButtons && (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="trello" className="w-full justify-center">
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>{t('header.dashboard_button')}</Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-center" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    {t('header.logout_button')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f2ff] px-3 py-1 text-xs font-medium text-[#0c66e4]">
              {t('landing.new_feature')}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {t('landing.title')}
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              {t('landing.description')}
            </p>
            <div className="flex flex-wrap gap-3">
              {showAuthButtons && (
                <>
                  <Button asChild variant="trello" className="px-6">
                    <Link href="/register">{t('landing.start_free')}</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6">
                    <Link href="/login">{t('landing.have_account')}</Link>
                  </Button>
                </>
              )}
              {showDashboardButtons && (
                <>
                  <Button asChild variant="trello" className="px-6">
                    <Link href="/dashboard">{t('landing.resume_work')}</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6">
                    <Link href="/dashboard/workspaces">{t('landing.view_workspaces')}</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">{t('landing.tagline')}</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">{t('landing.tagline_security')}</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">{t('landing.tagline_collab')}</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-3xl bg-[#0c66e4]/15" />
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-3xl bg-[#172b4d]/10" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{t('landing.example_board_title')}</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    {t('landing.example_board_status')}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['Brief', 'Design', 'Review', 'Launch'].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-[#0c66e4] px-4 py-3 text-sm text-white">
                  {t('landing.example_tasks_ready')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t('landing.why_taskly')}
            </span>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              {t('landing.features_title')}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.isArray(features) &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              features.map((feature: any) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="grid gap-10 rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">{t('landing.steps_title')}</h2>
            <p className="text-sm text-slate-600">
              {t('landing.steps_description')}
            </p>
          </div>
          <div className="grid gap-4">
            {Array.isArray(steps) &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              steps.map((step: any, index: number) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c66e4] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-3xl bg-[#0c66e4] px-8 py-10 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{t('landing.cta_title')}</h2>
              <p className="mt-2 text-sm text-white/80">
                {t('landing.cta_description')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {showAuthButtons && (
                <Button asChild variant="trelloGray" className="px-6 text-slate-900">
                  <Link href="/register">{t('landing.cta_button')}</Link>
                </Button>
              )}
              {showDashboardButtons && (
                <Button asChild variant="trelloGray" className="px-6 text-slate-900">
                  <Link href="/dashboard">{t('header.dashboard_button')}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span>{t('landing.footer_copyright', { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-700">
              {t('auth.login_link')}
            </Link>
            <Link href="/register" className="hover:text-slate-700">
              {t('auth.register_link')}
            </Link>
            <Link href="/dashboard" className="hover:text-slate-700">
              {t('common.dashboard')}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
