import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { z } from 'zod';

const errorSchema = z.object({ error: z.string() });

export function useAuthenticatedRequest() {
  const { getAccessTokenSilently } = useAuth0();
  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      const token = await getAccessTokenSilently();
      if (!token) throw new Error('Please sign in again.');
      headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`/api${path}`, { ...options, headers });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const error = errorSchema.safeParse(payload);
        throw new Error(error.success ? error.data.error : 'Request failed. Please retry.');
      }
      return response;
    },
    [getAccessTokenSilently],
  );
}
