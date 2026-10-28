import { HTTPException } from 'hono/http-exception';
import { resolveDocumentLinks } from './record-store';
import type { NewDocumentLinks } from '../shared/records';
import { canRead, generateDocumentTitle, readableAudiences } from '../shared/documents';
import type { Onboarding, OnboardingDocument } from '../shared/documents';
import { uploadLimits } from '../shared/limits';
import { validatePdf } from './pdf';
import { attachmentKey, createDocument } from './storage';
import type { Identity } from '../shared/auth';

interface Submission {
  onboarding: Onboarding;
  attachment: File | string | null;
  identity: Identity;
  links: NewDocumentLinks;
}

export async function submitDocument(bucket: R2Bucket, submission: Submission) {
  const { onboarding: input, attachment, identity } = submission;
  if (!canRead(identity.permissions, input.audience)) {
    throw new HTTPException(403, { message: 'You cannot create documents for this audience.' });
  }
  // Default to the creator's most restricted audience; only admins can change access later.
  const onboarding = {
    ...input,
    audience: readableAudiences(identity.permissions).at(-1) ?? input.audience,
  };
  const links = await resolveDocumentLinks(bucket, submission.links, identity.permissions);
  const pdf =
    attachment instanceof File && attachment.size > 0
      ? { ...(await validatePdf(attachment)), name: attachment.name, size: attachment.size }
      : undefined;
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const document: OnboardingDocument = {
    schemaVersion: 1,
    ...links,
    id,
    title: onboarding.title ?? generateDocumentTitle(createdAt),
    fullName: onboarding.fullName,
    department: onboarding.department,
    jobTitle: onboarding.jobTitle,
    startDate: onboarding.startDate,
    audience: onboarding.audience,
    createdAt: createdAt.toISOString(),
    createdBy: identity.subject,
    onboarding,
    ...(pdf
      ? {
          pdf: {
            name: pdf.name.slice(0, uploadLimits.shortText),
            size: pdf.size,
            sha256: pdf.sha256,
            key: attachmentKey(id),
          },
        }
      : {}),
  };
  if (pdf) {
    const uploaded = await bucket.put(attachmentKey(id), pdf.bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/pdf' },
    });
    if (!uploaded)
      throw new HTTPException(409, { message: 'Attachment already exists. Please retry.' });
  }
  if (!(await createDocument(bucket, document))) {
    throw new HTTPException(409, { message: 'Document already exists. Please retry.' });
  }
  return document;
}
