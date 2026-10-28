import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { inspect } from './cloudflare-cli.ts';
import { r2JurisdictionArguments } from '../shared/data-residency.ts';

export const productionKeyPath = '.backup-keys/production.key';

export function readBackupSecret(variables: Record<string, string>): string | undefined {
  return (
    variables.BACKUP_ENCRYPTION_KEY ||
    (existsSync(productionKeyPath) ? readFileSync(productionKeyPath, 'utf8').trim() : undefined)
  );
}

export function ensureBackupSecret(variables: Record<string, string>, bucket: string) {
  let secret = readBackupSecret(variables);
  if (!secret) {
    const stored = z
      .object({ objects: z.array(z.unknown()) })
      .parse(
        inspect([
          'r2',
          'objects',
          'list',
          '--bucket-name',
          bucket,
          '--per-page',
          '1',
          ...r2JurisdictionArguments,
        ]),
      );
    if (stored.objects.length > 0)
      throw new Error('Existing backups found. Restore the original encryption key.');
    secret = randomBytes(32).toString('hex');
    mkdirSync('.backup-keys', { recursive: true, mode: 0o700 });
    writeFileSync(productionKeyPath, secret, { flag: 'wx', mode: 0o600 });
    console.info(`Backup recovery key saved to ${productionKeyPath}. Keep an offline copy.`);
  }
  if (!/^[a-f0-9]{64}$/iu.test(secret))
    throw new Error('BACKUP_ENCRYPTION_KEY must be 64 hex characters.');
  return secret;
}
