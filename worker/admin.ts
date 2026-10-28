import { Hono } from 'hono';
import { z } from 'zod';
import { bodyLimit } from 'hono/body-limit';
import { documentAccessSchema } from '../shared/document-access';
import { permissions } from '../shared/documents';
import { requirePermission } from './authorization';
import { setDocumentAudience } from './document-access';
import type { WorkerContext } from './context';
import { invitations } from './invitations';

export const admin = new Hono<WorkerContext>();
admin.use('*', requirePermission(permissions.admin, 'Administrator access required.'));
admin.route('/invitations', invitations);
admin.put('/:collection/:id/access', bodyLimit({ maxSize: 1024 }), async (context) => {
  const collection = z
    .enum(['documents', 'people', 'cases'])
    .safeParse(context.req.param('collection'));
  if (!collection.success) return context.notFound();
  const id = z.uuid().safeParse(context.req.param('id'));
  if (!id.success) return context.json({ error: 'Document not found.' }, 404);
  const auditField =
    collection.data === 'people'
      ? 'accessedPersonIds'
      : collection.data === 'cases'
        ? 'accessedCaseIds'
        : 'accessedDocumentIds';
  context.set(auditField, [id.data]);
  const object = await context.env.DOCUMENTS.head(`${collection.data}/${id.data}.json`);
  if (!object) return context.json({ error: 'Document not found.' }, 404);
  const policy = documentAccessSchema.safeParse(await context.req.json());
  if (!policy.success) return context.json({ error: 'Invalid document access.' }, 400);
  await setDocumentAudience(context.env.DOCUMENTS, {
    id: collection.data === 'documents' ? id.data : `${collection.data}/${id.data}`,
    audience: policy.data.audience,
    subject: context.get('identity').subject,
  });
  return context.json(policy.data);
});
