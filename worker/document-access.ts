import { audienceSchema } from '../shared/documents';
import { storedAccessSchema } from '../shared/document-access';
import type { Audience } from '../shared/documents';

export const accessKey = (id: string) => `access/${id}.json`;

export async function documentAudience(bucket: R2Bucket, id: string, fallback: string) {
  const policy = await bucket.get(accessKey(id));
  if (policy) return storedAccessSchema.parse(await policy.json()).audience;
  return audienceSchema.parse(fallback);
}

export async function setDocumentAudience(
  bucket: R2Bucket,
  options: { id: string; audience: Audience; subject: string },
) {
  const policy = storedAccessSchema.parse({
    audience: options.audience,
    updatedBy: options.subject,
    updatedAt: new Date().toISOString(),
  });
  await bucket.put(accessKey(options.id), JSON.stringify(policy), {
    httpMetadata: { contentType: 'application/json' },
  });
}
