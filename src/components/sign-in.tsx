import { useAuth0 } from '@auth0/auth0-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function SignIn() {
  const { loginWithRedirect } = useAuth0();
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <CardHeader>
        <CardTitle>People records</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={() => {
            void loginWithRedirect({ appState: { returnTo: globalThis.location.pathname } });
          }}
        >
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
