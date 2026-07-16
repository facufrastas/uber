import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

// Route guard: without a session, everything redirects to /login (keeping
// the attempted URL to come back to it). When the api client's token renewal
// fails it clears the auth store, which re-renders this and kicks the user
// out. Local mode also passes through here: its fake login sets a demo token.
export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return children;
}
