import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { canRead } from '../shared/documents';
import { caseSchema, personSchema } from '../shared/records';
import { documentAudience } from './document-access';
import type { DocumentLinks } from '../shared/records';

export async function readPerson(bucket: R2Bucket, id: string, grants: readonly string[]) {
  if (!z.uuid().safeParse(id).success)
    throw new HTTPException(404, { message: 'Person not found.' });
  const object = await bucket.get(`people/${id}.json`);
  if (!object) throw new HTTPException(404, { message: 'Person not found.' });
  const person = personSchema.parse(await object.json());
  const audience = await documentAudience(bucket, `people/${id}`, person.audience);
  if (!canRead(grants, audience)) throw new HTTPException(404, { message: 'Person not found.' });
  return { ...person, audience };
}

export async function readCase(bucket: R2Bucket, id: string, grants: readonly string[]) {
  if (!z.uuid().safeParse(id).success) throw new HTTPException(404, { message: 'Case not found.' });
  const object = await bucket.get(`cases/${id}.json`);
  if (!object) throw new HTTPException(404, { message: 'Case not found.' });
  const record = caseSchema.parse(await object.json());
  const audience = await documentAudience(bucket, `cases/${id}`, record.audience);
  if (!canRead(grants, audience)) throw new HTTPException(404, { message: 'Case not found.' });
  await readPerson(bucket, record.personId, grants);
  return { ...record, audience };
}

export async function resolveDocumentLinks(
  bucket: R2Bucket,
  links: DocumentLinks,
  grants: readonly string[],
): Promise<DocumentLinks> {
  const record = links.caseId ? await readCase(bucket, links.caseId, grants) : undefined;
  if (record && links.personId && record.personId !== links.personId) {
    throw new HTTPException(400, { message: 'The case belongs to a different person.' });
  }
  const personId = record?.personId ?? links.personId;
  if (personId) await readPerson(bucket, personId, grants);
  return { ...(personId ? { personId } : {}), ...(record ? { caseId: record.id } : {}) };
}

export async function canReadLinks(
  bucket: R2Bucket,
  links: DocumentLinks,
  grants: readonly string[],
) {
  try {
    await resolveDocumentLinks(bucket, links, grants);
    return true;
  } catch (error) {
    if (error instanceof HTTPException && error.status === 404) return false;
    throw error;
  }
}
