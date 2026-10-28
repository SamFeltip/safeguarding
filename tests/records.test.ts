import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { createRuntime } from './runtime';
import { caseSchema, casesListSchema, personSchema, peopleListSchema } from '../shared/records';
import { documentListSchema, documentSchema, permissions } from '../shared/documents';
import { buildDocumentUpload } from '../src/lib/document-upload';

let emulator: Miniflare;
const member = [permissions.company, permissions.create];
const hr = [...member, permissions.hr];
const admin = [permissions.admin, permissions.create];
beforeAll(async () => {
  emulator = await createRuntime();
});
afterAll(async () => {
  await emulator.dispose();
});
async function request(path: string, grants: string[] = member, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-Test-Permissions', grants.join(','));
  const source = new Request(`http://test${path}`, { ...options, headers });
  return emulator.dispatchFetch(source.url, {
    method: source.method,
    headers: [...source.headers.entries()],
    ...(source.body ? { body: new Uint8Array(await source.arrayBuffer()) } : {}),
  });
}
function json(value: unknown, method = 'POST'): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}
async function createPerson(grants: string[] = member) {
  const response = await request(
    '/people',
    grants,
    json({
      fullName: 'Alex Morgan',
      email: 'alex@example.com',
      jobTitle: 'Designer',
      department: 'Design',
      manager: 'Jamie',
      location: 'London',
    }),
  );
  expect(response.status).toBe(201);
  return personSchema.parse(await response.json());
}
async function createCase(personId: string, grants: string[] = member) {
  const response = await request(
    '/cases',
    grants,
    json({ title: 'Joining the company', personId }),
  );
  expect(response.status).toBe(201);
  return caseSchema.parse(await response.json());
}
function upload(personId?: string, caseId?: string) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    fullName: 'Alex Morgan',
    email: 'alex@example.com',
    jobTitle: 'Designer',
    department: 'Design',
    manager: 'Jamie',
    location: 'London',
    startDate: '2026-11-09',
    employmentType: 'Full-time',
    equipment: 'Laptop',
    notes: '',
    audience: 'company',
  }))
    form.set(key, value);
  if (personId) form.set('personId', personId);
  if (caseId) form.set('caseId', caseId);
  form.set('pdf', new File(['%PDF-1.7\n%%EOF'], 'offer.pdf', { type: 'application/pdf' }));
  return buildDocumentUpload(form);
}

describe('people, cases and immutable linked documents', () => {
  it('creates independent people and cases, and filters documents by their saved links', async () => {
    const person = await createPerson();
    const record = await createCase(person.id);
    const other = await createCase(person.id);
    const response = await request('/documents', member, {
      method: 'POST',
      body: upload(undefined, record.id),
    });
    expect(response.status).toBe(201);
    const document = documentSchema.parse(await response.json());
    expect(document.personId).toBe(person.id);
    expect(document.caseId).toBe(record.id);
    expect(person.createdBy).not.toBe(person.id);
    const list = documentListSchema.parse(
      await (await request(`/documents?caseId=${record.id}`)).json(),
    );
    expect(list.documents.map((item) => item.id)).toContain(document.id);
    const empty = documentListSchema.parse(
      await (await request(`/documents?caseId=${other.id}`)).json(),
    );
    expect(empty.documents).toHaveLength(0);
    const personDocuments = documentListSchema.parse(
      await (await request(`/documents?personId=${person.id}`)).json(),
    );
    expect(personDocuments.documents.map((item) => item.id)).toContain(document.id);
    const cases = casesListSchema.parse(
      await (await request(`/cases?personId=${person.id}`)).json(),
    );
    expect(cases.cases.map((item) => item.id)).toEqual(
      expect.arrayContaining([record.id, other.id]),
    );
    const otherPerson = await createPerson();
    const mismatch = await request('/documents', member, {
      method: 'POST',
      body: upload(otherPerson.id, record.id),
    });
    expect(mismatch.status).toBe(400);
    expect((await request(`/people/${person.id}`)).status).toBe(200);
    expect((await request(`/cases/${record.id}`)).status).toBe(200);
  });
  it('audits people and case access with their targets and actor', async () => {
    const person = await createPerson();
    const record = await createCase(person.id);
    await request(`/people/${person.id}`);
    await request(`/cases/${record.id}`);
    const audit = z
      .array(
        z.object({
          subject: z.string(),
          action: z.string(),
          status: z.number(),
          personIds: z.array(z.string()),
          caseIds: z.array(z.string()),
        }),
      )
      .parse(await (await request('/audit-records', admin)).json());
    expect(
      audit.some(
        (entry) =>
          entry.action === 'person' &&
          entry.subject === 'auth0|alice' &&
          entry.personIds.includes(person.id) &&
          entry.status === 200,
      ),
    ).toBe(true);
    expect(
      audit.some(
        (entry) =>
          entry.action === 'case' &&
          entry.subject === 'auth0|alice' &&
          entry.caseIds.includes(record.id) &&
          entry.status === 200,
      ),
    ).toBe(true);
  });

  it('denies hidden parent IDs, case listings, forged links and unauthorized creation', async () => {
    const person = await createPerson(hr);
    const record = await createCase(person.id, hr);
    expect((await request(`/people/${person.id}`)).status).toBe(404);
    expect((await request(`/cases/${record.id}`)).status).toBe(404);
    expect((await request(`/cases?personId=${person.id}`)).status).toBe(404);
    expect((await request(`/documents?caseId=${record.id}`)).status).toBe(404);
    const people = peopleListSchema.parse(await (await request('/people')).json());
    expect(people.people.some((item) => item.id === person.id)).toBe(false);
    const cases = casesListSchema.parse(await (await request('/cases')).json());
    expect(cases.cases.some((item) => item.id === record.id)).toBe(false);
    expect(
      (await request('/cases', member, json({ title: 'Forged', personId: person.id }))).status,
    ).toBe(404);
    expect(
      (await request('/documents', member, { method: 'POST', body: upload(person.id, record.id) }))
        .status,
    ).toBe(404);
    expect(
      (await request('/people', [], json({ fullName: 'X', email: 'x@example.com' }))).status,
    ).toBe(403);
    expect((await request('/cases', [], json({ title: 'X', personId: person.id }))).status).toBe(
      403,
    );
    expect((await request('/documents?caseId=invalid')).status).toBe(400);
    expect((await request('/people', member, json({ fullName: 'X', email: 'bad' }))).status).toBe(
      400,
    );
  });
  it('enforces parent policy changes on linked lists, JSON and PDFs without modifying documents', async () => {
    const person = await createPerson();
    const record = await createCase(person.id);
    const response = await request('/documents', member, {
      method: 'POST',
      body: upload(person.id, record.id),
    });
    const document = documentSchema.parse(await response.json());
    for (const [collection, id] of [
      ['people', person.id],
      ['cases', record.id],
    ]) {
      expect(
        (
          await request(
            `/admin/${collection}/${id}/access`,
            member,
            json({ audience: 'admin' }, 'PUT'),
          )
        ).status,
      ).toBe(403);
      const policyPath = `/admin/${collection}/${id}/access`;
      expect((await request(policyPath, admin, json({ audience: 'admin' }, 'PUT'))).status).toBe(
        200,
      );
      expect((await request(`/documents/${document.id}`)).status).toBe(404);
      expect((await request(`/documents/${document.id}/pdf`)).status).toBe(404);
      const list = documentListSchema.parse(await (await request('/documents')).json());
      expect(list.documents.some((item) => item.id === document.id)).toBe(false);
      expect((await request(`/documents/${document.id}`, admin)).status).toBe(200);
      expect((await request(`/documents/${document.id}/pdf`, admin)).status).toBe(200);
      expect((await request(policyPath, admin, json({ audience: 'company' }, 'PUT'))).status).toBe(
        200,
      );
      expect((await request(`/documents/${document.id}`)).status).toBe(200);
    }
    const stored = documentSchema.parse(
      await (await request(`/stored/${document.id}`, admin)).json(),
    );
    expect(stored).toEqual(document);
  });
});
