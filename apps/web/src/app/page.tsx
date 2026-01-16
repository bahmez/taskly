/**
 * Public Home Page
 *
 * Landing page for unauthenticated users.
 * Shows Taskly branding and tRPC test.
 * Provides navigation to login/register or dashboard.
 *
 * Display logic:
 * - Loading: Show nothing
 * - Not authenticated: Show Login/Register buttons
 * - Authenticated: Show Dashboard/Logout buttons
 * - Always: Show tRPC test panel for debugging
 */

'use client';

import Link from 'next/link';
import { Button } from '@taskly/ui';
import { useAuth } from '@/auth/auth-provider';

const features = [
  {
    title: 'Tableaux clairs et rapides',
    description: 'Organisez vos tâches en colonnes et gardez une vue d’ensemble.',
  },
  {
    title: 'Collaboration en temps réel',
    description: 'Invitez vos coéquipiers, assignez des tâches et suivez l’avancement.',
  },
  {
    title: 'Notifications utiles',
    description: 'Recevez les mises à jour importantes sans être submergé.',
  },
  {
    title: 'Gestion multi‑workspaces',
    description: 'Séparez vos projets perso, clients ou équipes en un clic.',
  },
];

const steps = [
  { title: 'Créez un workspace', description: 'Démarrez un projet en quelques secondes.' },
  { title: 'Invitez votre équipe', description: 'Ajoutez des membres et définissez les rôles.' },
  { title: 'Lancez votre board', description: 'Organisez, priorisez et livrez plus vite.' },
];

/**
 * Home page component.
 * Entry point for new users to the application.
 *
 * @returns Landing page with auth-based navigation
 */
export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const showAuthButtons = !loading && !user;
  const showDashboardButtons = !loading && user;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c66e4] text-white font-semibold">
              T
            </div>
            <span className="text-lg font-semibold text-slate-900">Taskly</span>
          </div>
          <div className="flex items-center gap-2">
            {showAuthButtons && (
              <>
                <Button asChild variant="trelloGray">
                  <Link href="/login">Se connecter</Link>
                </Button>
                <Button asChild variant="trello">
                  <Link href="/register">Créer un compte</Link>
                </Button>
              </>
            )}
            {showDashboardButtons && (
              <>
                <Button asChild variant="trello">
                  <Link href="/dashboard">Aller au dashboard</Link>
                </Button>
                <Button variant="outline" onClick={() => logout()}>
                  Se déconnecter
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f2ff] px-3 py-1 text-xs font-medium text-[#0c66e4]">
              Nouveau: intégrations Google et GitHub
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Gérez vos projets avec clarté, vitesse et sérénité.
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Taskly centralise vos tâches, vos équipes et vos décisions dans des boards simples
              et visuels. Passez de l’idée à l’exécution sans friction.
            </p>
            <div className="flex flex-wrap gap-3">
              {showAuthButtons && (
                <>
                  <Button asChild variant="trello" className="px-6">
                    <Link href="/register">Démarrer gratuitement</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6">
                    <Link href="/login">J’ai déjà un compte</Link>
                  </Button>
                </>
              )}
              {showDashboardButtons && (
                <>
                  <Button asChild variant="trello" className="px-6">
                    <Link href="/dashboard">Reprendre mon travail</Link>
                  </Button>
                  <Button asChild variant="outline" className="px-6">
                    <Link href="/dashboard/workspaces">Voir mes workspaces</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Aucun engagement</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Sécurité Firebase</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Collaboration fluide</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-3xl bg-[#0c66e4]/15" />
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-3xl bg-[#172b4d]/10" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Board Marketing</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    En cours
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
                  3 tâches prêtes à être livrées
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Pourquoi Taskly
            </span>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Tout ce qu’il faut pour livrer mieux, ensemble.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
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
            <h2 className="text-2xl font-semibold text-slate-900">Un flux simple en 3 étapes</h2>
            <p className="text-sm text-slate-600">
              Taskly s’adapte à votre rythme. Commencez petit, évoluez vite.
            </p>
          </div>
          <div className="grid gap-4">
            {steps.map((step, index) => (
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
              <h2 className="text-2xl font-semibold">Prêt à rendre vos équipes plus fluides ?</h2>
              <p className="mt-2 text-sm text-white/80">
                Commencez maintenant et invitez votre équipe en quelques minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {showAuthButtons && (
                <Button asChild variant="trelloGray" className="px-6 text-slate-900">
                  <Link href="/register">Créer un compte</Link>
                </Button>
              )}
              {showDashboardButtons && (
                <Button asChild variant="trelloGray" className="px-6 text-slate-900">
                  <Link href="/dashboard">Ouvrir mon espace</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Taskly. Tous droits réservés.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-700">
              Se connecter
            </Link>
            <Link href="/register" className="hover:text-slate-700">
              S’inscrire
            </Link>
            <Link href="/dashboard" className="hover:text-slate-700">
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}


