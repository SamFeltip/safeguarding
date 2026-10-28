import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

export function useAppAuth() {
  const { user, isAuthenticated, isLoading, error, logout } = useAuth0();
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      await logout({ logoutParams: { returnTo: globalThis.location.origin } });
    }
  }, [logout]);
  return { user, isAuthenticated, isLoading, error, signOut };
}
