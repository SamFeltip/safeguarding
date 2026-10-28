import { useAuth0 } from '@auth0/auth0-react';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { databaseConnection } from '../../shared/auth';

export function AccountPage() {
  const { user, loginWithRedirect } = useAuth0();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageBreadcrumb items={[{ label: 'Documents', to: '/' }, { label: 'Account settings' }]} />
      <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sign-in methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium [overflow-wrap:anywhere]">{user?.email}</p>
          <p className="text-sm leading-relaxed">
            Sign in with a password and a code from your authenticator app, or use a passkey. After
            a password sign-in, Auth0 offers to save a passkey on a supported device.
          </p>
          <p className="text-sm text-muted-foreground">
            On iPhone or Mac, save your passkey in Passwords to synchronize it through iCloud
            Keychain. To change your password, choose “Forgot password?” on the secure sign-in
            screen.
          </p>
          <Button
            onClick={() => {
              void loginWithRedirect({
                authorizationParams: { connection: databaseConnection, prompt: 'login' },
                appState: { returnTo: '/account' },
              });
            }}
          >
            Open secure sign-in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
