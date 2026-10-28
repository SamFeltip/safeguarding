import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api';
import { identitySchema } from '../../shared/auth';
import { Failure, Loading } from './feedback';
import type { ReactNode } from 'react';

const IdentityContext = createContext<string[] | undefined>(undefined);
export function usePermissions() {
  const permissions = useContext(IdentityContext);
  if (!permissions) throw new Error('usePermissions requires IdentityProvider.');
  return permissions;
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const identity = useQuery({
    queryKey: ['identity'],
    queryFn: ({ signal }) => api('/me', identitySchema, { signal }),
    staleTime: 0,
  });
  if (identity.isPending) return <Loading />;
  if (identity.isError) {
    return (
      <Failure
        error={identity.error}
        retry={() => {
          void identity.refetch();
        }}
      />
    );
  }
  return (
    <IdentityContext.Provider value={identity.data.permissions}>
      {children}
    </IdentityContext.Provider>
  );
}
