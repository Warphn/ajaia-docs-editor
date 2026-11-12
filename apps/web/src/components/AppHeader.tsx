import { LogOut, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCurrentUser, useLogout } from '../auth/use-current-user';
import { useTheme } from '../theme/theme';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Wordmark } from './Wordmark';

/** Top bar shared by all signed-in pages. `children` fills the middle (e.g. the document title). */
export function AppHeader({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  function signOut() {
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-sheet">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link to="/documents" aria-label="All documents" className="shrink-0 rounded-md">
          <Wordmark compactOnMobile />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        {currentUser && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 text-sm sm:flex" title={currentUser.email}>
              <Avatar name={currentUser.name} size="sm" />
              {currentUser.name}
            </span>
            {/* With a title in the header (editor), small screens need the room: the toggle stays on the list. */}
            <span className={children ? 'hidden sm:block' : undefined}>
              <Button variant="ghost" onClick={toggleTheme} aria-label={nextThemeLabel} title={nextThemeLabel} className="px-2">
                {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              </Button>
            </span>
            <Button variant="ghost" onClick={signOut} disabled={logout.isPending} aria-label="Sign out" className="px-2 sm:px-3.5">
              <LogOut size={16} aria-hidden="true" className="sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
