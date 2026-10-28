import { newDocumentLinksSchema } from '../../shared/records';
import { onboardingSchema } from '../../shared/documents';
import { pdfSizeLabel, uploadLimits } from '../../shared/limits';

export function buildDocumentUpload(form: FormData): FormData {
  const values = Object.fromEntries(
    [...form.entries()].filter(([key]) => !['pdf', 'personId', 'caseId'].includes(key)),
  );
  const result = onboardingSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(' '));
  }
  if (form.getAll('caseId').length !== 1 || form.getAll('personId').length > 1) {
    throw new Error('Select exactly one case for this document.');
  }
  const links = newDocumentLinksSchema.parse({
    personId: form.get('personId') ?? undefined,
    caseId: form.get('caseId') ?? undefined,
  });
  const pdf = form.get('pdf');
  if (pdf instanceof File && pdf.size > uploadLimits.pdfBytes) {
    throw new Error(`The PDF must be ${pdfSizeLabel} or smaller.`);
  }
  const body = new FormData();
  if (links.personId) body.set('personId', links.personId);
  if (links.caseId) body.set('caseId', links.caseId);
  body.set('onboarding', JSON.stringify(result.data));
  if (pdf instanceof File && pdf.size > 0) body.set('pdf', pdf);
  return body;
}
