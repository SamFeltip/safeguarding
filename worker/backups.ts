import { Hono } from 'hono';
import { z } from 'zod';
import { permissions } from '../shared/documents';
import { backupKey } from '../shared/backup-crypto';
import { requirePermission } from './authorization';
import { readCursor } from './pagination';
import { completedBackupPrefix } from '../shared/backup-paths';
import { storageLimits } from '../shared/limits';
import type { WorkerContext } from './context';

export const backups = new Hono<WorkerContext>();
backups.use('*', requirePermission(permissions.admin, 'Administrator access required.'));
backups.get('/', async (context) => {
  const page = await context.env.BACKUPS.list({
    prefix: completedBackupPrefix,
    limit: storageLimits.pageSize,
    ...readCursor(context.req.query('cursor')),
  });
  return context.json({
    backups: page.objects.map((object) => ({
      id: object.key.slice(completedBackupPrefix.length, -'.enc'.length),
      completedAt: object.uploaded.toISOString(),
    })),
    cursor: page.truncated ? page.cursor : null,
  });
});
backups.post('/', async (context) => {
  try {
    await backupKey(context.env.BACKUP_ENCRYPTION_KEY);
  } catch {
    return context.json({ error: 'Backup encryption is not configured.' }, 503);
  }
  const id = crypto.randomUUID();
  await context.env.BACKUP_JOBS.create({
    id,
    params: { createdBy: context.get('identity').subject, startedAt: new Date().toISOString() },
  });
  return context.json({ id, status: 'queued' }, 202);
});
backups.get('/:id', async (context) => {
  const id = z.uuid().safeParse(context.req.param('id'));
  if (!id.success) return context.json({ error: 'Backup not found.' }, 404);
  try {
    const instance = await context.env.BACKUP_JOBS.get(id.data);
    const state = await instance.status();
    return context.json({ id: id.data, status: state.status });
  } catch {
    return context.json({ error: 'Backup not found.' }, 404);
  }
});
