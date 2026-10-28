import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { loadEnv } from 'vite';
import { provisionAccount } from '../worker/provision-account.ts';
import { sendPasswordSetup } from '../worker/password-setup.ts';
import { accountPermissions, invitationSchema } from '../shared/invitations.ts';

const email = process.argv[2];
const invitation = invitationSchema.parse({ email, permissions: accountPermissions });
const variables = loadEnv('production', process.cwd(), '');
const service = z
  .object({
    AUTH0_SERVICE_CLIENT_ID: z.string(),
    AUTH0_SERVICE_CLIENT_SECRET: z.string(),
  })
  .parse(
    JSON.parse(
      readFileSync(variables.AUTH0_SERVICE_SECRETS_FILE || '.auth0-service.local', 'utf8'),
    ),
  );
const userId = await provisionAccount(
  {
    ...service,
    AUTH0_DOMAIN: 'safeguarding.uk.auth0.com',
    AUTH0_AUDIENCE: 'https://safeguarding.samfelton.com/api',
  },
  invitation,
);
await sendPasswordSetup(
  { ...service, AUTH0_DOMAIN: 'safeguarding.uk.auth0.com' },
  invitation.email,
);
console.info(JSON.stringify({ email: invitation.email, userId, invitationSent: true }));
