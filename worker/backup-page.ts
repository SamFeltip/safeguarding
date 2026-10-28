import { backupKey } from '../shared/backup-crypto';
import { backupPaths } from '../shared/backup-paths';
import { backupLimits } from '../shared/limits';
import { backupObject } from './backup-object';
import { saveEncryptedJson } from './backup-store';
import type { WorkerContext } from './context';

interface BackupPageOptions {
  id: string;
  startedAt: string;
  createdBy: string;
  index: number;
  cursor?: string;
}

export async function backupPage(
  environment: WorkerContext['Bindings'],
  options: BackupPageOptions,
) {
  const { id, startedAt, createdBy, index, cursor } = options;
  const key = await backupKey(environment.BACKUP_ENCRYPTION_KEY);
  const page = await environment.DOCUMENTS.list({
    limit: backupLimits.pageSize,
    ...(cursor ? { cursor } : {}),
  });
  const entries: string[] = [];
  let bytes = 0;
  for (const item of page.objects) {
    if (item.uploaded.getTime() > Date.parse(startedAt)) continue;
    const result = await backupObject(environment, { item, runId: id, createdBy, key });
    entries.push(result.storageKey);
    bytes += result.bytes;
  }
  await saveEncryptedJson(environment.BACKUPS, backupPaths.page(id, index), entries, key);
  return { cursor: page.truncated ? page.cursor : null, objects: entries.length, bytes };
}
