import { loadEnv } from 'vite';
import { authConfigurationSchema } from '../shared/auth.ts';
import config from '../cloudflare.config.ts';
import { residencyConfigurationSchema } from './residency-policy.ts';

export function deploymentConfiguration() {
  const variables = loadEnv('production', process.cwd(), '');
  const authentication = authConfigurationSchema.safeParse({
    domain: variables.VITE_AUTH0_DOMAIN,
    clientId: variables.VITE_AUTH0_CLIENT_ID,
    audience: variables.VITE_AUTH0_AUDIENCE,
  });
  if (!authentication.success) throw new Error('Configure Auth0 in .env.local before deploying.');
  residencyConfigurationSchema.parse(variables);
  if (!authentication.data.domain.endsWith('.eu.auth0.com')) {
    throw new Error('Use the canonical domain of an EU Auth0 tenant for this deployment.');
  }
  if (
    authentication.data.domain !== config.worker.env.AUTH0_DOMAIN.value ||
    authentication.data.audience !== config.worker.env.AUTH0_AUDIENCE.value
  ) {
    throw new Error('Browser and Worker Auth0 settings must match.');
  }
  const documentsBucket = config.worker.env.DOCUMENTS.name;
  const backupsBucket = config.worker.env.BACKUPS.name;
  if (!documentsBucket || !backupsBucket || documentsBucket === backupsBucket) {
    throw new Error('Use separate data and backup buckets.');
  }
  return { variables, documentsBucket, backupsBucket };
}
