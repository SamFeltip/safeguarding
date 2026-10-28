interface LoginEvent {
  client: { client_id: string };
  user: {
    last_password_reset?: string;
    app_metadata?: {
      safeguarding_approved?: boolean;
      safeguarding_password_setup_after?: string;
      safeguarding_subject?: string;
    };
  };
  connection?: { strategy: string; name?: string };
  transaction?: { protocol?: string };
  authentication?: { methods?: { name: string }[] };
}
interface LoginApi {
  access: { deny: (reason: string) => void };
  accessToken: { setCustomClaim: (name: string, value: string | boolean) => void };
  multifactor: { enable: (provider: string, options?: { allowRememberBrowser: boolean }) => void };
}

// Auth0 does not issue tokens until its required MFA challenge completes.
export function onExecutePostLogin(event: LoginEvent, api: LoginApi) {
  if (event.client.client_id !== 'Zl0n2i6EoUStoReM1KJkqsK01BPsVLvS') return;
  const metadata = event.user.app_metadata;
  if (metadata?.safeguarding_approved !== true) {
    api.access.deny('An administrator must approve your safeguarding account.');
    return;
  }
  if (event.connection?.strategy !== 'auth0' || event.connection.name !== 'safeguarding-members') {
    api.access.deny('Use the safeguarding password or passkey sign-in.');
    return;
  }
  const refreshing = event.transaction?.protocol === 'oauth2-refresh-token';
  const methods = event.authentication?.methods ?? [];
  const passkey = methods.some((method) => method.name === 'passkey');
  const password = methods.some((method) => method.name === 'pwd');
  if (!refreshing && !passkey && !password) {
    api.access.deny('Password or passkey authentication is required.');
    return;
  }
  const setupAfter = metadata.safeguarding_password_setup_after;
  if (
    !passkey &&
    setupAfter &&
    !(Date.parse(event.user.last_password_reset ?? '') > Date.parse(setupAfter))
  ) {
    api.access.deny(
      'Set your own password using your invitation email or Forgot password before signing in.',
    );
    return;
  }
  // A refresh token is issued only after the primary login and its required MFA.
  if (!refreshing) {
    if (passkey) api.multifactor.enable('none');
    else api.multifactor.enable('google-authenticator', { allowRememberBrowser: false });
  }
  api.accessToken.setCustomClaim('https://safeguarding.samfelton.com/approved', true);
  api.accessToken.setCustomClaim('https://safeguarding.samfelton.com/authenticated', true);
  api.accessToken.setCustomClaim(
    'https://safeguarding.samfelton.com/authentication-policy',
    'database-password-mfa-or-passkey-v1',
  );
  if (metadata.safeguarding_subject)
    api.accessToken.setCustomClaim(
      'https://safeguarding.samfelton.com/subject',
      metadata.safeguarding_subject,
    );
}
