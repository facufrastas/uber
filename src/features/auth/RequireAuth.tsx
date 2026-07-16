import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { isLocalDataSource } from '@/data/repositories';
import { useAuthStore } from '@/stores/authStore';

// Route guard: without a session, everything redirects to /login (keeping
// the attempted URL to come back to it). When the api client's token renewal
// fails it clears the auth store, which re-renders this and kicks the user
// out. In local mode (mock data, no backend) there is nothing to guard.
export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  if (!isLocalDataSource && !accessToken) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return children;
}
