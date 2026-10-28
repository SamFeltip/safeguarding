import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { createRuntime } from './runtime';
import { caseSchema, casesListSchema, personSchema } from '../shared/records';
import { documentSchema, permissions } from '../shared/documents';
import { buildDocumentUpload } from '../src/lib/document-upload';

let emulator: Miniflare;
const member = [permissions.company, permissions.create];
const hr = [...member, permissions.hr];
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

describe('optional people on cases', () => {
  it('creates people without email and cases with zero or several people', async () => {
    const response = await request('/people', member, json({ fullName: 'No email' }));
    expect(response.status).toBe(201);
    const first = personSchema.parse(await response.json());
    expect(first.email).toBe('');
    const second = await createPerson();
    const empty = await request('/cases', member, json({ title: 'Unassigned case' }));
    expect(empty.status).toBe(201);
    expect(caseSchema.parse(await empty.json()).personIds).toEqual([]);
    const multiple = await request(
      '/cases',
      member,
      json({ title: 'Shared case', personIds: [first.id, second.id] }),
    );
    expect(multiple.status).toBe(201);
    const record = caseSchema.parse(await multiple.json());
    for (const person of [first, second]) {
      const list = casesListSchema.parse(
        await (await request(`/cases?personId=${person.id}`)).json(),
      );
      expect(list.cases.map((item) => item.id)).toContain(record.id);
    }
    const documentResponse = await request('/documents', member, {
      method: 'POST',
      body: upload(second.id, record.id),
    });
    expect(documentResponse.status).toBe(201);
    const document = documentSchema.parse(await documentResponse.json());
    const changed = await request(
      `/cases/${record.id}/people`,
      member,
      json({ personIds: [first.id] }, 'PUT'),
    );
    expect(changed.status).toBe(200);
    expect(caseSchema.parse(await changed.json()).personIds).toEqual([first.id]);
    // Updating membership does not invalidate the person saved on an existing document.
    expect((await request(`/documents/${document.id}`)).status).toBe(200);
    const removed = await request(
      `/cases/${record.id}/people`,
      member,
      json({ personIds: [] }, 'PUT'),
    );
    expect(removed.status).toBe(200);
  });
  it('does not attach hidden people to a case', async () => {
    const hidden = await createPerson(hr);
    expect(
      (await request('/cases', member, json({ title: 'Shared', personIds: [hidden.id] }))).status,
    ).toBe(404);
  });
});
