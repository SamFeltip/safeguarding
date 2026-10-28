import { z } from 'zod';
import type { Invitation } from '../shared/invitations';
import { databaseAccount, userSchema } from './auth0-management.ts';
import type { ManagementEnvironment } from './auth0-management.ts';
import { databaseConnection } from '../shared/auth.ts';

export class AccountConflict extends Error {}
export async function provisionAccount(
  environment: ManagementEnvironment & { AUTH0_AUDIENCE: string },
  invitation: Invitation,
) {
  const { email, permissions } = invitation;
  const requested = [...new Set(permissions)].toSorted();
  const { request, user: existing } = await databaseAccount(environment, email);
  const account =
    existing ??
    userSchema.parse(
      await request('users', 'POST', {
        connection: databaseConnection,
        password: `Aa1!${[...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`,
        email,
        email_verified: false,
        verify_email: false,
        app_metadata: {
          safeguarding_approved: false,
          safeguarding_pending_permissions: requested,
          safeguarding_password_setup_after: new Date().toISOString(),
        },
      }),
    );
  const path = `users/${encodeURIComponent(account.user_id)}`;
  const previous = z
    .array(
      z.object({
        permission_name: z.string(),
        resource_server_identifier: z.string(),
      }),
    )
    .parse(await request(`${path}/permissions`));
  const current = previous.filter(
    (grant) => grant.resource_server_identifier === environment.AUTH0_AUDIENCE,
  );
  const samePermissions =
    JSON.stringify(current.map((grant) => grant.permission_name).toSorted()) ===
    JSON.stringify(requested);
  const pending =
    account.app_metadata?.safeguarding_approved !== true &&
    JSON.stringify(account.app_metadata?.safeguarding_pending_permissions) ===
      JSON.stringify(requested);
  if (
    existing &&
    !pending &&
    (!samePermissions || existing.app_metadata?.safeguarding_approved !== true)
  ) {
    throw new AccountConflict(
      'This account already exists with different permissions. Existing access was not changed.',
    );
  }
  if (!samePermissions)
    await request(`${path}/permissions`, 'POST', {
      permissions: requested.map((permission_name) => ({
        resource_server_identifier: environment.AUTH0_AUDIENCE,
        permission_name,
      })),
    });
  if (account.app_metadata?.safeguarding_approved !== true) {
    await request(path, 'PATCH', { app_metadata: { safeguarding_approved: true } });
  }
  return account.user_id;
}
