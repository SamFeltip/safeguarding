import {
  audienceSchema,
  canRead,
  documentSchema,
  documentSummarySchema,
} from '../shared/documents';
import type { DocumentSummary, OnboardingDocument } from '../shared/documents';

export const attachmentKey = (id: string) => `attachments/${id}.pdf`;
export const documentPrefix = 'documents/';
export const documentKey = (id: string) => `${documentPrefix}${id}.json`;

export function visibleSummary(
  metadata: Record<string, string>,
  grants: readonly string[],
): DocumentSummary | undefined {
  const audience = audienceSchema.safeParse(metadata.audience);
  if (!audience.success || !canRead(grants, audience.data)) return;
  const result = documentSummarySchema.safeParse(metadata);
  return result.success ? result.data : undefined;
}

export async function createDocument(bucket: R2Bucket, document: OnboardingDocument) {
  const parsed = documentSchema.parse(document);
  const {
    onboarding: _onboarding,
    schemaVersion: _schemaVersion,
    pdf: _pdf,
    personId,
    caseId,
    title,
    ...summary
  } = parsed;
  return bucket.put(documentKey(parsed.id), JSON.stringify(parsed, undefined, 2), {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      ...summary,
      ...(title ? { title } : {}),
      ...(personId ? { personId } : {}),
      ...(caseId ? { caseId } : {}),
    },
  });
}
