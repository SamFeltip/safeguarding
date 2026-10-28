import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { backupKey } from '../shared/backup-crypto';
import { backupPage } from './backup-page';
import { saveEncryptedJson } from './backup-store';
import { backupPaths } from '../shared/backup-paths';
import type { WorkerContext } from './context';

export interface BackupParameters {
  createdBy: string;
  startedAt: string;
}
export class BackupWorkflow extends WorkflowEntrypoint<
  WorkerContext['Bindings'],
  BackupParameters
> {
  override async run(event: WorkflowEvent<BackupParameters>, step: WorkflowStep) {
    const id = event.instanceId;
    const { startedAt, createdBy } = event.payload;
    let cursor: string | undefined;
    let pages = 0;
    let objects = 0;
    let bytes = 0;
    do {
      const currentCursor = cursor;
      const pageIndex = pages;
      const page = await step.do(`page-${String(pages)}`, { timeout: '5 minutes' }, () =>
        backupPage(this.env, { id, startedAt, index: pageIndex, createdBy, cursor: currentCursor }),
      );
      cursor = page.cursor ?? undefined;
      pages += 1;
      objects += page.objects;
      bytes += page.bytes;
    } while (cursor);
    await step.do('complete', async () => {
      const manifest = {
        version: 1,
        id,
        createdBy,
        startedAt,
        completedAt: new Date().toISOString(),
        pages,
        objects,
        bytes,
      };
      const key = await backupKey(this.env.BACKUP_ENCRYPTION_KEY);
      await saveEncryptedJson(this.env.BACKUPS, backupPaths.manifest(id), manifest, key);
      await saveEncryptedJson(this.env.BACKUPS, backupPaths.completed(id), manifest, key);
    });
    return { id, objects, bytes };
  }
}
