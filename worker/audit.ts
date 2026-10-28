import { identitySchema } from '../shared/auth';
import type { MiddlewareHandler } from 'hono';
import type { WorkerContext } from './context';
import { persistAudit } from './audit-store';

export const auditAccess: MiddlewareHandler<WorkerContext> = async (context, next) => {
  const path = context.req.path.replace(/^\/api/u, '');
  if (!/^\/(?:documents|backups|admin|people|cases)(?:\/|$)/u.test(path)) return next();
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  context.header('X-Request-ID', requestId);
  await next();
  const actor = identitySchema.safeParse(context.get('identity'));
  const record = {
    version: 1,
    requestId,
    occurredAt: new Date().toISOString(),
    subject: actor.success ? actor.data.subject : null,
    permissions: actor.success ? actor.data.permissions : [],
    action: path.startsWith('/admin')
      ? 'access-policy'
      : path.startsWith('/people')
        ? 'person'
        : path.startsWith('/cases')
          ? 'case'
          : path.startsWith('/backups')
            ? 'backup'
            : path.endsWith('/pdf')
              ? 'pdf'
              : 'document',
    personIds: context.get('accessedPersonIds') ?? [],
    caseIds: context.get('accessedCaseIds') ?? [],
    method: context.req.method,
    path,
    documentIds: context.get('accessedDocumentIds') ?? [],
    status: context.res.status,
    durationMs: Date.now() - startedAt,
    ip: context.req.header('CF-Connecting-IP') ?? null,
    userAgent: context.req.header('User-Agent')?.slice(0, 512) ?? null,
    ray: context.req.header('CF-Ray') ?? null,
  };
  try {
    await persistAudit(context.env.DOCUMENTS, record);
  } catch {
    console.error(JSON.stringify({ event: 'audit_write_failed', requestId }));
    return context.json({ error: 'Access could not be recorded.' }, 503);
  }
};
