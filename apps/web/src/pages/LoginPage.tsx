import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useCurrentUser, useLogin } from '../auth/use-current-user';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Wordmark } from '../components/Wordmark';

const DEMO_PASSWORD = 'demo1234';

const DEMO_ACCOUNTS = [
  { name: 'Alice Martins', email: 'alice@ajaia.dev', hint: 'Owns the welcome document' },
  { name: 'Bob Chen', email: 'bob@ajaia.dev', hint: 'Can edit the document Alice shared' },
  { name: 'Carol Silva', email: 'carol@ajaia.dev', hint: 'Starts with no documents' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/documents';

  if (currentUser.data) {
    return <Navigate to={redirectTo} replace />;
  }

  function signIn(credentials: { email: string; password: string }) {
    login.mutate(credentials, { onSuccess: () => navigate(redirectTo, { replace: true }) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    signIn({ email, password });
  }

  return (
    <main className="canvas-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Wordmark className="mb-8 justify-center" />

        <section className="rounded-lg border border-line bg-sheet p-6 shadow-[0_1px_2px_rgba(27,34,48,0.06)] sm:p-8">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Specs, RFCs and status updates, written together.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block h-10 w-full rounded-md border border-line-strong px-3 text-sm focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 block h-10 w-full rounded-md border border-line-strong px-3 text-sm focus:border-primary"
              />
            </label>

            {login.isError && (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                {login.error.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending || !email || !password}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </section>

        <section className="mt-6" aria-labelledby="demo-accounts-heading">
          <h2 id="demo-accounts-heading" className="text-sm font-medium">
            Demo accounts
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Sign in as two people in different browsers to try sharing. Password: <code className="font-mono">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  disabled={login.isPending}
                  onClick={() => signIn({ email: account.email, password: DEMO_PASSWORD })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas disabled:opacity-60"
                >
                  <Avatar name={account.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{account.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{account.hint}</span>
                  </span>
                  <span className="text-xs font-medium text-primary">Sign in</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
