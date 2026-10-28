import { HTTPException } from 'hono/http-exception';
import { resolveDocumentLinks } from './record-store';
import type { NewDocumentLinks } from '../shared/records';
import { canRead, generateDocumentTitle, readableAudiences } from '../shared/documents';
import type { Onboarding, OnboardingDocument } from '../shared/documents';
import { uploadLimits } from '../shared/limits';
import { validateAttachment } from './attachments';
import { attachmentSchema } from '../shared/documents';
import { attachmentKey, createDocument } from './storage';
import type { Identity } from '../shared/auth';

interface Submission {
  onboarding: Onboarding;
  attachment?: File | string | null;
  attachments?: (File | string)[];
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
  const links = await resolveDocumentLinks(bucket, submission.links, identity.permissions, true);
  const files = [...(submission.attachments ?? []), ...(attachment ? [attachment] : [])].filter(
    (file): file is File => file instanceof File && file.size > 0,
  );
  if (
    files.length > uploadLimits.attachmentCount ||
    files.reduce((sum, file) => sum + file.size, 0) > uploadLimits.totalAttachmentBytes
  )
    throw new HTTPException(400, {
      message: 'Upload up to 10 attachments, totaling at most 50 MiB.',
    });
  const validated = [];
  for (const file of files)
    validated.push({ ...(await validateAttachment(file)), name: file.name, size: file.size });
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
    attachments: validated.map((file, index) =>
      attachmentSchema.parse({
        name: file.name.slice(0, uploadLimits.shortText),
        size: file.size,
        sha256: file.sha256,
        contentType: file.contentType,
        key:
          index === 0 && file.contentType === 'application/pdf'
            ? attachmentKey(id)
            : `attachments/${id}/${String(index)}`,
      }),
    ),
    ...(validated[0]?.contentType === 'application/pdf'
      ? {
          pdf: {
            name: validated[0].name.slice(0, uploadLimits.shortText),
            size: validated[0].size,
            sha256: validated[0].sha256,
            key: attachmentKey(id),
          },
        }
      : {}),
  };
  for (const [index, file] of validated.entries()) {
    const metadata = document.attachments?.[index];
    if (!metadata) throw new Error('Missing attachment metadata.');
    const uploaded = await bucket.put(metadata.key, file.bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: file.contentType },
    });
    if (!uploaded)
      throw new HTTPException(409, { message: 'Attachment already exists. Please retry.' });
  }
  if (!(await createDocument(bucket, document))) {
    throw new HTTPException(409, { message: 'Document already exists. Please retry.' });
  }
  return document;
}
