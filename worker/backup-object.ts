import { digest, packRecord } from '../shared/backup-crypto';
import { backupPaths } from '../shared/backup-paths';
import { backupLimits } from '../shared/limits';
import { persistAudit } from './audit-store';
import { saveEncrypted } from './backup-store';
import type { WorkerContext } from './context';

interface BackupObjectOptions {
  item: R2Object;
  runId: string;
  createdBy: string;
  key: CryptoKey;
}

export async function backupObject(
  environment: WorkerContext['Bindings'],
  options: BackupObjectOptions,
) {
  const { item, runId, createdBy, key } = options;
  if (item.size > backupLimits.objectBytes)
    throw new Error('Source object exceeds backup size limit.');
  const object = await environment.DOCUMENTS.get(item.key);
  if (object?.etag !== item.etag) throw new Error('Source changed during backup.');
  const data = await object.arrayBuffer();
  if (/^(?:documents|attachments)\//u.test(item.key)) {
    await persistAudit(environment.DOCUMENTS, {
      version: 1,
      occurredAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      subject: createdBy,
      action: 'backup.read',
      backupId: runId,
      resourceKey: item.key,
      status: 200,
      method: 'WORKFLOW',
    });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  const record = packRecord(
    {
      key: item.key,
      size: data.byteLength,
      sha256: await digest(data),
      uploaded: object.uploaded.toISOString(),
      etag: object.etag,
      customMetadata: object.customMetadata ?? {},
      httpMetadata: Object.fromEntries(headers.entries()),
    },
    data,
  );
  const sourceHash = await digest(new Uint8Array(new TextEncoder().encode(item.key)).buffer);
  const storageKey = backupPaths.object(runId, sourceHash);
  await saveEncrypted(environment.BACKUPS, storageKey, record, key);
  return { storageKey, bytes: data.byteLength };
}
