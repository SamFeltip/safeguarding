import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
import { z } from 'zod';
import { backupKey, unpackRecord, unseal } from '../shared/backup-crypto.ts';
import { backupPaths, isBackupObjectKey } from '../shared/backup-paths.ts';
import { readBackupSecret } from './backup-key.ts';
import { backupManifestSchema } from '../shared/backup-format.ts';
import config from '../cloudflare.config.ts';
import { cli } from './cloudflare-cli.ts';
import { r2JurisdictionArguments } from '../shared/data-residency.ts';

const id = z.uuid().parse(process.argv[2]);
const destination = process.argv[3];
if (!destination)
  throw new Error('Usage: npm run backup:restore -- <backup-id> <new-output-directory>');
const output = path.resolve(destination);
if (existsSync(output)) throw new Error('Restore destination must not already exist.');
const variables = loadEnv('production', process.cwd(), '');
const secret = readBackupSecret(variables);
if (!secret) throw new Error('The backup recovery key is missing.');
const key = await backupKey(secret);
async function retrieve(storageKey: string) {
  const bytes = process.env.BACKUP_SOURCE_DIRECTORY
    ? readFileSync(path.join(process.env.BACKUP_SOURCE_DIRECTORY, storageKey))
    : execFileSync(
        cli,
        [
          'r2',
          'objects',
          'get',
          storageKey,
          '--bucket-name',
          config.worker.env.BACKUPS.name ?? '',
          ...r2JurisdictionArguments,
        ],
        { maxBuffer: 20 * 1024 * 1024 },
      );
  return unseal(new Uint8Array(bytes).buffer, key, storageKey);
}
const decoder = new TextDecoder();
const manifest = backupManifestSchema.parse(
  JSON.parse(decoder.decode(await retrieve(backupPaths.manifest(id)))),
);
if (manifest.id !== id) throw new Error('Backup ID mismatch.');
mkdirSync(output, { recursive: true, mode: 0o700 });
const restored = new Set<string>();
let bytes = 0;
for (let page = 0; page < manifest.pages; page += 1) {
  const entries = z
    .array(z.string())
    .parse(JSON.parse(decoder.decode(await retrieve(backupPaths.page(id, page)))));
  for (const storageKey of entries) {
    if (!isBackupObjectKey(id, storageKey)) {
      throw new Error('Invalid backup object key.');
    }
    const record = await unpackRecord(await retrieve(storageKey));
    const sourceKey = record.metadata.key;
    const target = path.resolve(output, 'objects', sourceKey);
    const root = `${path.join(output, 'objects')}${path.sep}`;
    if (
      !target.startsWith(root) ||
      sourceKey.split('/').includes('..') ||
      restored.has(sourceKey)
    ) {
      throw new Error('Unsafe or duplicate source key.');
    }
    mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, new Uint8Array(record.data), { flag: 'wx', mode: 0o600 });
    const metadataPath = path.join(output, 'metadata', `${sourceKey}.json`);
    mkdirSync(path.dirname(metadataPath), { recursive: true, mode: 0o700 });
    writeFileSync(metadataPath, JSON.stringify(record.metadata, undefined, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    restored.add(sourceKey);
    bytes += record.data.byteLength;
  }
}
if (restored.size !== manifest.objects || bytes !== manifest.bytes)
  throw new Error('Incomplete backup.');
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, undefined, 2), {
  mode: 0o600,
});
console.info(
  `Restored and verified ${String(restored.size)} objects (${String(bytes)} bytes) to ${output}.`,
);
