import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import App from './App';
import { authConfiguration } from './lib/config';
import { Card, CardHeader, CardTitle } from './components/ui/card';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0 } },
});
const rootElement = document.querySelector('#root');
if (!rootElement) throw new Error('Root element is missing.');
const returnState = z.object({ returnTo: z.string().startsWith('/').optional() });
const config = authConfiguration;

createRoot(rootElement).render(
  <StrictMode>
    {config.success ? (
      <Auth0Provider
        domain={config.data.domain}
        clientId={config.data.clientId}
        authorizationParams={{
          audience: config.data.audience,
          redirect_uri: globalThis.location.origin,
          scope: 'openid profile email',
        }}
        cacheLocation="localstorage"
        useRefreshTokens
        useRefreshTokensFallback
        onRedirectCallback={(state) => {
          const path = returnState.safeParse(state);
          const returnTo = path.success ? path.data.returnTo : '/';
          globalThis.history.replaceState(
            {},
            '',
            returnTo?.startsWith('//') ? '/' : (returnTo ?? '/'),
          );
        }}
      >
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </Auth0Provider>
    ) : (
      <main className="mx-auto max-w-xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication unavailable</CardTitle>
          </CardHeader>
        </Card>
      </main>
    )}
  </StrictMode>,
);
