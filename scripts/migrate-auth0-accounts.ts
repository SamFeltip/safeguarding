import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { loadEnv } from 'vite';
import { management, userSchema } from '../worker/auth0-management.ts';
import { provisionAccount } from '../worker/provision-account.ts';
import { sendPasswordSetup } from '../worker/password-setup.ts';
import { invitationSchema } from '../shared/invitations.ts';
import { databaseConnection } from '../shared/auth.ts';

const variables = loadEnv('production', process.cwd(), '');
const service = z
  .object({ AUTH0_SERVICE_CLIENT_ID: z.string(), AUTH0_SERVICE_CLIENT_SECRET: z.string() })
  .parse(
    JSON.parse(
      readFileSync(variables.AUTH0_SERVICE_SECRETS_FILE || '.auth0-service.local', 'utf8'),
    ),
  );
const environment = {
  ...service,
  AUTH0_DOMAIN: 'safeguarding.uk.auth0.com',
  AUTH0_AUDIENCE: 'https://safeguarding.samfelton.com/api',
};
const request = await management(environment);
const users = [];
for (let page = 0; ; page++) {
  const batch = z.array(userSchema).parse(await request(`users?per_page=100&page=${String(page)}`));
  users.push(...batch);
  if (batch.length < 100) break;
}
let migrated = 0;
for (const user of users.filter(
  (user) => user.user_id.startsWith('email|') && user.app_metadata?.safeguarding_approved === true,
)) {
  const grants = z
    .array(z.object({ permission_name: z.string(), resource_server_identifier: z.string() }))
    .parse(await request(`users/${encodeURIComponent(user.user_id)}/permissions`));
  const invitation = invitationSchema.parse({
    email: user.email,
    permissions: grants
      .filter((grant) => grant.resource_server_identifier === environment.AUTH0_AUDIENCE)
      .map((grant) => grant.permission_name),
  });
  const id = await provisionAccount(environment, invitation);
  const target = userSchema.parse(await request(`users/${encodeURIComponent(id)}`));
  if (
    target.app_metadata?.safeguarding_subject &&
    target.app_metadata.safeguarding_subject !== user.user_id
  )
    throw new Error('An existing canonical identity needs review.');
  await request(`users/${encodeURIComponent(id)}`, 'PATCH', {
    app_metadata: {
      safeguarding_subject: user.user_id,
      safeguarding_password_setup_after:
        target.app_metadata?.safeguarding_password_setup_after ?? new Date().toISOString(),
    },
  });
  migrated++;
}
// Older administrator-created demo accounts also require their own password at first use.
for (const user of users.filter(
  (user) =>
    user.user_id.startsWith('auth0|') &&
    user.identities?.some((identity) => identity.connection === databaseConnection) &&
    user.app_metadata?.safeguarding_approved === true &&
    !user.app_metadata.safeguarding_password_setup_after,
)) {
  const current = userSchema.parse(await request(`users/${encodeURIComponent(user.user_id)}`));
  if (!current.app_metadata?.safeguarding_password_setup_after)
    await request(`users/${encodeURIComponent(user.user_id)}`, 'PATCH', {
      app_metadata: { safeguarding_password_setup_after: new Date().toISOString() },
    });
}
await sendPasswordSetup(environment, 'mail.samfelton@gmail.com');
console.info(
  JSON.stringify({ migrated, adminPasswordSetupEmailSent: true, retainedLegacyIdentities: true }),
);
