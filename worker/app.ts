import { records } from './records';
import { admin } from './admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { auditAccess } from './audit';
import { backups } from './backups';
import { authenticate } from './auth';
import { documents } from './documents';
import type { WorkerContext } from './context';

const app = new Hono<WorkerContext>();
app.use('/api/*', secureHeaders());
app.use('/api/*', async (context, next) => {
  context.header('Cache-Control', 'private, no-store');
  await next();
});
app.get('/api/health', (context) => context.json({ status: 'ok' }));
app.use('/api/*', auditAccess);
app.use('/api/*', authenticate);
app.get('/api/me', (context) => context.json(context.get('identity')));
app.route('/api/admin', admin);
app.route('/api', records);
app.route('/api/documents', documents);
app.route('/api/backups', backups);
app.all('/api/*', (context) => context.json({ error: 'Route or method not found.' }, 404));
app.onError((error, context) => {
  if (error instanceof HTTPException) return context.json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return context.json({ error: 'Invalid JSON.' }, 400);
  console.error(JSON.stringify({ event: 'request_failed', name: error.name }));
  return context.json({ error: 'The request failed. Please try again.' }, 500);
});
export default app;
