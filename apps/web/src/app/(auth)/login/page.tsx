import { LoginClient } from './login-client';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : undefined;
  return <LoginClient nextPath={next} />;
}


