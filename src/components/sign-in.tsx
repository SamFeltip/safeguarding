import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Failure } from './feedback';
import { databaseConnection } from '../../shared/auth';

export function SignIn() {
  const { loginWithRedirect } = useAuth0();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  return (
    <Card className="mx-auto mt-10 max-w-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <CardHeader>
        <CardTitle>Sign in to People records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use your password and an authenticator code, or sign in with a passkey.
        </p>
        <Button
          className="w-full"
          disabled={opening}
          onClick={() => {
            setOpening(true);
            setError(null);
            void loginWithRedirect({
              authorizationParams: { connection: databaseConnection },
              appState: { returnTo: globalThis.location.pathname },
            }).catch(() => {
              setOpening(false);
              setError(new Error('Unable to open sign-in. Please try again.'));
            });
          }}
        >
          {opening ? 'Opening secure sign-in…' : 'Continue to sign in'}
        </Button>
        {error ? <Failure error={error} /> : null}
        <p className="text-sm text-muted-foreground">
          New here? An administrator must invite you. Open your invitation email to set your
          password before signing in for the first time.
        </p>
      </CardContent>
    </Card>
  );
}
