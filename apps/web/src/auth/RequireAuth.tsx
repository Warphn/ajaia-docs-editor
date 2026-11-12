import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullPageMessage } from '../components/FullPageMessage';
import { useCurrentUser } from './use-current-user';

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const currentUser = useCurrentUser();

  if (currentUser.isPending) {
    return <FullPageMessage title="Loading…" />;
  }
  if (currentUser.isError) {
    return (
      <FullPageMessage
        title="Can't reach Ajaia Docs"
        description="The server did not respond. If the app was idle it may be waking up, so try again in a few seconds."
        action={{ label: 'Try again', onClick: () => void currentUser.refetch() }}
      />
    );
  }
  if (!currentUser.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
