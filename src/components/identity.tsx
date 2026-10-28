import { createContext, useContext } from 'react';
import { useAppAuth } from '@/hooks/use-app-auth';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api';
import { identitySchema } from '../../shared/auth';
import { Failure, Loading } from './feedback';
import { Button } from './ui/button';
import type { ReactNode } from 'react';

const IdentityContext = createContext<string[] | undefined>(undefined);
export function usePermissions() {
  const permissions = useContext(IdentityContext);
  if (!permissions) throw new Error('usePermissions requires IdentityProvider.');
  return permissions;
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAppAuth();
  const api = useApi();
  const identity = useQuery({
    queryKey: ['identity'],
    queryFn: ({ signal }) => api('/me', identitySchema, { signal }),
    staleTime: 0,
  });
  if (identity.isPending) return <Loading />;
  if (identity.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <Failure
          error={identity.error}
          retry={() => {
            void identity.refetch();
          }}
        />
        <p>
          Access requires an administrator-approved account. Use your password and authenticator
          code, or a registered passkey to continue.
        </p>
        <Button
          onClick={() => {
            void signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }
  return (
    <IdentityContext.Provider value={identity.data.permissions}>
      {children}
    </IdentityContext.Provider>
  );
}
