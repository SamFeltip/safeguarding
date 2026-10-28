import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { inspect, run } from './cloudflare-cli.ts';
import { ensureEuBucket } from './eu-buckets.ts';
import { assertEuWorkflow, verifyCloudflareResidency } from './cloudflare-residency.ts';
import config from '../cloudflare.config.ts';
import { deploymentConfiguration } from './deployment-config.ts';
import { assertPrivateBuckets } from './bucket-privacy.ts';
import { ensureBackupSecret } from './backup-key.ts';

async function deploy() {
  if (process.argv.length > 2) {
    throw new Error(
      'Deployment overrides are disabled. Configure the EU deployment in .env.local.',
    );
  }
  const { variables, documentsBucket, backupsBucket } = deploymentConfiguration();
  const identity = z.object({ authenticated: z.boolean() }).parse(inspect(['auth', 'whoami']));
  if (!identity.authenticated) throw new Error('Run npx cf auth login before deploying.');
  await verifyCloudflareResidency(variables, true);
  ensureEuBucket(documentsBucket);
  ensureEuBucket(backupsBucket);
  assertPrivateBuckets([documentsBucket, backupsBucket]);
  const secret = ensureBackupSecret(variables, backupsBucket);
  const directory = mkdtempSync(path.join(tmpdir(), 'safeguarding-deploy-'));
  try {
    const secretsPath = path.join(directory, 'secrets.json');
    const authenticationSecrets = z
      .object({
        AUTH0_SERVICE_CLIENT_ID: z.string().min(1),
        AUTH0_SERVICE_CLIENT_SECRET: z.string().min(1),
      })
      .parse(
        JSON.parse(
          readFileSync(variables.AUTH0_SERVICE_SECRETS_FILE || '.auth0-service.local', 'utf8'),
        ),
      );
    writeFileSync(
      secretsPath,
      JSON.stringify({
        BACKUP_ENCRYPTION_KEY: secret,
        ...authenticationSecrets,
      }),
      { mode: 0o600 },
    );
    run(['deploy', '--secrets-file', secretsPath]);
    assertEuWorkflow(config.worker.exports.BackupWorkflow.name);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

try {
  await deploy();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Deployment failed.');
  process.exitCode = 1;
}
