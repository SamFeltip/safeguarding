import { canReadLinks } from './record-store';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import { canRead, documentSchema } from '../shared/documents';
import { documentAudience } from './document-access';
import { documentKey } from './storage';
import type { WorkerContext } from './context';

export const requireReadableDocument: MiddlewareHandler<WorkerContext> = async (context, next) => {
  const id = z.uuid().safeParse(context.req.param('id'));
  if (!id.success) throw new HTTPException(404, { message: 'Document not found.' });
  context.set('accessedDocumentIds', [id.data]);
  const grants = context.get('identity').permissions;
  const object = await context.env.DOCUMENTS.get(documentKey(id.data));
  if (!object) {
    throw new HTTPException(404, { message: 'Document not found.' });
  }
  const document = documentSchema.parse(await object.json());
  const audience = await documentAudience(context.env.DOCUMENTS, id.data, document.audience);
  if (
    !canRead(grants, audience) ||
    !(await canReadLinks(context.env.DOCUMENTS, document, grants))
  ) {
    throw new HTTPException(404, { message: 'Document not found.' });
  }
  context.set('document', { ...document, audience });
  await next();
};
