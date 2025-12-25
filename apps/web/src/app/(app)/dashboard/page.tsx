import Link from 'next/link';
import { Button } from '@taskly/ui';

export default function DashboardPage() {
  return (
    <div className="p-6 text-[#b6c2cf]">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-[#9fadbc]">Tu es connecté (Firebase Auth) et tu es dans une route protégée.</p>

      <div className="mt-6">
        <Button asChild variant="trelloGray">
          <Link href="/design-system">Voir la page Design System</Link>
        </Button>
      </div>
    </div>
  );
}


