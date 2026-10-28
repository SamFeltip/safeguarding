import { newDocumentLinksSchema } from '../../shared/records';
import { onboardingSchema } from '../../shared/documents';
import { pdfSizeLabel, uploadLimits } from '../../shared/limits';

export function buildDocumentUpload(form: FormData): FormData {
  const values = Object.fromEntries(
    [...form.entries()].filter(
      ([key]) => !['pdf', 'attachments', 'personId', 'caseId'].includes(key),
    ),
  );
  const result = onboardingSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(' '));
  }
  if (form.getAll('caseId').length > 1 || form.getAll('personId').length > 1) {
    throw new Error('Select at most one case for this document.');
  }
  const links = newDocumentLinksSchema.parse({
    personId: form.get('personId') ?? undefined,
    caseId: form.get('caseId') ?? undefined,
  });
  const files = [...form.getAll('pdf'), ...form.getAll('attachments')].filter(
    (file): file is File => file instanceof File && file.size > 0,
  );
  if (files.length > uploadLimits.attachmentCount) throw new Error('Upload up to 10 attachments.');
  if (files.some((file) => file.size > uploadLimits.pdfBytes))
    throw new Error(`Each attachment must be ${pdfSizeLabel} or smaller.`);
  if (files.reduce((total, file) => total + file.size, 0) > uploadLimits.totalAttachmentBytes)
    throw new Error('Attachments must total 50 MiB or less.');
  const body = new FormData();
  if (links.personId) body.set('personId', links.personId);
  if (links.caseId) body.set('caseId', links.caseId);
  body.set('onboarding', JSON.stringify(result.data));
  for (const file of files) body.append('attachments', file);
  return body;
}
