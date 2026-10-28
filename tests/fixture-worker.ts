import { records } from '../worker/records';
import { admin } from '../worker/admin';
import { Hono } from 'hono';
import { auditAccess } from '../worker/audit';
import { backups } from '../worker/backups';
import { documents } from '../worker/documents';
import type { WorkerContext } from '../worker/context';

// This entrypoint is bundled only by tests and never referenced by deployment config.
const app = new Hono<WorkerContext>();
app.use('*', async (context, next) => {
  context.set('identity', {
    subject: context.req.header('X-Test-Subject') ?? 'auth0|alice',
    permissions: (context.req.header('X-Test-Permissions') ?? '').split(','),
  });
  await next();
});
app.use('*', auditAccess);
app.route('/admin', admin);
app.route('/', records);
app.route('/documents', documents);
app.route('/backups', backups);
app.get('/stored/:id', async (context) => {
  const object = await context.env.DOCUMENTS.get(`documents/${context.req.param('id')}.json`);
  return new Response(object?.body, { headers: { 'Content-Type': 'application/json' } });
});
app.get('/audit-records', async (context) => {
  const page = await context.env.DOCUMENTS.list({ prefix: 'audit/' });
  const records = await Promise.all(
    page.objects.map(async (object) => {
      const body = await context.env.DOCUMENTS.get(object.key);
      return body?.json();
    }),
  );
  return context.json(records);
});
app.get('/backup-object', async (context) => {
  const object = await context.env.BACKUPS.get(context.req.query('key') ?? '');
  return object ? new Response(object.body) : context.notFound();
});
app.get('/source-keys', async (context) => {
  const page = await context.env.DOCUMENTS.list();
  return context.json(page.objects.map((object) => object.key));
});
export { BackupWorkflow } from '../worker/backup-workflow';
export default app;
