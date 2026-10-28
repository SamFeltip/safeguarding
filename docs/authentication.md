# Authentication

Safeguarding uses Auth0 Universal Login on `safeguarding.uk.auth0.com` with the
`safeguarding-members` database connection. Public signup and social login are
not enabled for the SPA. Admins create users and choose application permissions.

## Invitation and first sign-in

1. Admin settings → Accounts creates a database user with a cryptographically random
   bootstrap password. That password is not returned, logged or emailed.
2. Auth0 sends its standard change-password email, serving as the invitation.
3. The recipient sets their own password through Auth0's hosted page, then signs in.
4. The post-login Action rejects a password sign-in until `last_password_reset` is
   newer than the administrator-managed `safeguarding_password_setup_after` timestamp.
5. Password sign-ins require a TOTP authenticator challenge, with browser remembering
   disabled. Auth0 controls enrollment, QR codes, verification and recovery codes.
6. Auth0's progressive enrollment offers a passkey on supported devices. Subsequent
   passkey sign-ins skip the additional authenticator-code challenge.

This follows Auth0's standard invitation workflow: password setup occurs **before
initial application access**, rather than exposing a custom password form in the app.
A user with an existing passkey can use it without resetting an unused password.
Apple Passwords can store the passkey and synchronize it through iCloud Keychain.

Invitations to an already-approved account do not silently change its permissions.
The native Forgot password option sends another password-reset email when needed.

## Enforcement

The existing Post-Login Action is limited to the safeguarding SPA. It requires
administrator-managed approval and the dedicated database connection. Password
authentication calls `api.multifactor.enable('google-authenticator',
{ allowRememberBrowser: false })`; Auth0 does not issue the authorization result
until that required challenge succeeds. A genuine `passkey` method skips MFA.
Unrelated tenant applications are outside this Action's policy.

The Action emits the signed `authentication-policy` claim
`database-password-mfa-or-passkey-v1`. The resource API requires that policy,
administrator approval, authenticated status and a database `sub`, in addition
to RS256, issuer, audience, expiry and application permissions. It accepts only
bearer tokens. The SDK keeps tokens in memory; the application does not store them
in localStorage or issue its own authentication/session cookies.

Legacy magic-link endpoints return 410 and legacy callback URLs return to sign-in.
Old email-session cookies and tokens cannot satisfy the new API policy. The old
KV namespace can expire its existing markers; it is no longer bound to the Worker.
The obsolete email/passkey-linking implementation has been removed from the app.

## Existing account migration

`scripts/migrate-auth0-accounts.ts` copies approved email-account permissions to
the dedicated database identity, marks initial password setup as required, and
sends the admin their hosted password-setup email. Existing identities remain in
Auth0 for history; this migration does not link or delete them.

To preserve existing record and access-policy references, an administrator-controlled
`safeguarding_subject` metadata value retains the original canonical identity. The
Action copies that value into a signed claim, and the API uses it for record ownership
and audit subjects. Users cannot select their own permissions or canonical identity.

## Operations

- `scripts/configure-auth0-login.ts` configures the dedicated connection and SPA,
  enables OTP and recovery codes, and disables the legacy email connection for
  the old login service. Global MFA policies remain unchanged; this app's Action
  requests the correct challenge for each login method.
- `scripts/deploy-auth0-policy.ts` uploads Auth0's required literal handler signature.
- `scripts/invite-account.ts <email>` provisions an account with all application
  permissions and sends the standard password-setup email. The admin API supports
  choosing individual permissions.
- The ignored private `.auth0-service.local` contains only deployment-side credentials
  needed by account management. The Worker uses the Account Service client ID and
  secret; no Management API secret is bundled into the frontend.

The built-in Auth0 email sender currently serves setup emails for testing and has
production delivery limits. Configure a production email provider before general
rollout. Authentication stays in the existing UK tenant; EU private record storage
and backup settings are unchanged.

References: [Auth0 invitations](https://auth0.com/docs/customize/email/send-email-invitations-for-application-signup),
[password change on first login](https://support.auth0.com/center/s/article/force-new-user-to-change-password-on-first-login),
[Universal Login passkeys](https://auth0.com/docs/authenticate/database-connections/passkeys),
[Auth0 MFA](https://auth0.com/docs/secure/multi-factor-authentication).
