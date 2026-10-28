import { useAppAuth } from './hooks/use-app-auth';
import { AppHeader } from '@/components/app-header';
import { SignIn } from '@/components/sign-in';
import { Failure, Loading } from '@/components/feedback';
import { IdentityProvider } from '@/components/identity';
import { AppRoutes } from './routes';

export default function App() {
  const { isLoading, isAuthenticated, error } = useAppAuth();
  if (isAuthenticated)
    return (
      <IdentityProvider>
        <div className="min-h-screen">
          <AppHeader />
          <main className="mx-auto max-w-6xl px-4 py-8 [overflow-wrap:anywhere] sm:px-5 sm:py-14">
            <AppRoutes />
          </main>
        </div>
      </IdentityProvider>
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 [overflow-wrap:anywhere] sm:px-5 sm:py-10">
      {error ? <Failure error={error} /> : null}
      {isLoading ? <Loading /> : <SignIn />}
    </main>
  );
}
