import { canReadLinks, resolveDocumentLinks } from './record-store';
import { documentLinksSchema, newDocumentLinksSchema } from '../shared/records';
import { documentAudience } from './document-access';
import { Hono } from 'hono';
import { z } from 'zod';
import { bodyLimit } from 'hono/body-limit';
import { onboardingSchema, permissions } from '../shared/documents';
import { requestSizeLabel, storageLimits, uploadLimits } from '../shared/limits';
import { requirePermission } from './authorization';
import { submitDocument } from './document-submission';
import { readCursor } from './pagination';
import { requireReadableDocument } from './readable-document';
import { attachmentKey, documentPrefix, visibleSummary } from './storage';
import type { WorkerContext } from './context';

export const documents = new Hono<WorkerContext>();
documents.get('/', async (context) => {
  const checkedFilters = documentLinksSchema.safeParse({
    personId: context.req.query('personId'),
    caseId: context.req.query('caseId'),
  });
  if (!checkedFilters.success) return context.json({ error: 'Invalid person or case.' }, 400);
  const filters = checkedFilters.data;
  await resolveDocumentLinks(context.env.DOCUMENTS, filters, context.get('identity').permissions);
  const page = await context.env.DOCUMENTS.list({
    prefix: documentPrefix,
    limit: storageLimits.pageSize,
    include: ['customMetadata'],
    ...readCursor(context.req.query('cursor')),
  });
  const grants = context.get('identity').permissions;
  const summaries = await Promise.all(
    page.objects.map(async (object) => {
      const metadata = object.customMetadata;
      if (!metadata?.id || !metadata.audience) return;
      const audience = await documentAudience(
        context.env.DOCUMENTS,
        metadata.id,
        metadata.audience,
      );
      const summary = visibleSummary({ ...metadata, audience }, grants);
      if (
        !summary ||
        (filters.personId && summary.personId !== filters.personId) ||
        (filters.caseId && summary.caseId !== filters.caseId)
      )
        return;
      return (await canReadLinks(context.env.DOCUMENTS, summary, grants)) ? summary : undefined;
    }),
  );
  const visible = summaries.filter((summary) => summary !== undefined);
  context.set(
    'accessedDocumentIds',
    visible.map((document) => document.id),
  );
  return context.json({ documents: visible, cursor: page.truncated ? page.cursor : null });
});

documents.post(
  '/',
  requirePermission(permissions.create, 'You do not have permission to create documents.'),
  bodyLimit({
    maxSize: uploadLimits.requestBytes,
    onError: (context) =>
      context.json({ error: `Upload exceeds the ${requestSizeLabel} request limit.` }, 413),
  }),
  async (context) => {
    const form = await context.req.formData();
    const payload = form.get('onboarding');
    if (typeof payload !== 'string' || payload.length > uploadLimits.formCharacters) {
      return context.json({ error: 'Invalid onboarding data.' }, 400);
    }
    const input: unknown = JSON.parse(payload);
    const result = onboardingSchema.safeParse(input);
    if (!result.success) {
      return context.json(
        { error: 'Check the form fields.', issues: z.flattenError(result.error) },
        400,
      );
    }
    if (form.getAll('caseId').length > 1 || form.getAll('personId').length > 1) {
      return context.json({ error: 'Select at most one case for this document.' }, 400);
    }
    const links = newDocumentLinksSchema.safeParse({
      personId: form.get('personId') ?? undefined,
      caseId: form.get('caseId') ?? undefined,
    });
    if (!links.success) return context.json({ error: 'Invalid person or case.' }, 400);
    const document = await submitDocument(context.env.DOCUMENTS, {
      onboarding: result.data,
      links: links.data,
      attachment: form.get('pdf'),
      attachments: form.getAll('attachments'),
      identity: context.get('identity'),
    });
    context.set('accessedDocumentIds', [document.id]);
    context.set('accessedPersonIds', document.personId ? [document.personId] : []);
    context.set('accessedCaseIds', document.caseId ? [document.caseId] : []);
    return context.json(document, 201);
  },
);

documents.get('/:id', requireReadableDocument, (context) => context.json(context.get('document')));
documents.get('/:id/pdf', requireReadableDocument, async (context) => {
  const document = context.get('document');
  if (!document.pdf) return context.json({ error: 'Document not found.' }, 404);
  const pdf = await context.env.DOCUMENTS.get(attachmentKey(document.id));
  if (!pdf) return context.json({ error: 'Attachment not found.' }, 404);
  return new Response(pdf.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="onboarding-${document.id}.pdf"`,
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
});

documents.get('/:id/attachments/:index', requireReadableDocument, async (context) => {
  const document = context.get('document');
  const index = context.req.param('index');
  if (!/^(0|[1-9]\d*)$/u.test(index)) return context.notFound();
  const attachment = document.attachments?.[Number(index)];
  if (!attachment) return context.notFound();
  const object = await context.env.DOCUMENTS.get(attachment.key);
  if (!object) return context.notFound();
  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.contentType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
});
