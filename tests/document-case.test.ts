import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { createRuntime } from './runtime';
import { seedCase } from './record-fixtures';
import {
  documentListSchema,
  documentSchema,
  generateDocumentTitle,
  permissions,
} from '../shared/documents';

let emulator: Miniflare;
let caseId: string;
let otherCaseId: string;
const onboarding = {
  fullName: 'Alex Morgan',
  email: 'alex@example.com',
  jobTitle: 'Engineer',
  department: 'Product',
  manager: 'Casey',
  startDate: '2026-11-01',
  employmentType: 'Full-time',
  location: 'London',
  equipment: 'Laptop',
  notes: '',
  audience: 'company',
};
beforeAll(async () => {
  emulator = await createRuntime();
  caseId = (await seedCase(emulator)).record.id;
  otherCaseId = (await seedCase(emulator)).record.id;
});
afterAll(async () => {
  await emulator.dispose();
});
async function upload(caseIds: string[], title?: string) {
  const form = new FormData();
  form.set('onboarding', JSON.stringify({ ...onboarding, title }));
  for (const id of caseIds) form.append('caseId', id);
  const source = new Request('http://test/documents', { method: 'POST', body: form });
  return emulator.dispatchFetch(source.url, {
    method: 'POST',
    headers: [
      ...source.headers.entries(),
      ['X-Test-Permissions', `${permissions.company},${permissions.create}`],
    ],
    body: new Uint8Array(await source.arrayBuffer()),
  });
}

describe('optional immutable case per new document', () => {
  it('generates a title when the submitted title contains only whitespace', async () => {
    const response = await upload([caseId], '   ');
    expect(response.status).toBe(201);
    const saved = documentSchema.parse(await response.json());
    expect(saved.title).toBe(generateDocumentTitle(new Date(saved.createdAt)));
  });
  it('rejects duplicate, multiple and array-valued case selections', async () => {
    for (const ids of [
      [caseId, caseId],
      [caseId, otherCaseId],
      [JSON.stringify([caseId, otherCaseId])],
    ]) {
      expect((await upload(ids)).status).toBe(400);
    }
  });
  it('creates a document without a case or any entered fields', async () => {
    const form = new FormData();
    form.set('onboarding', '{}');
    const source = new Request('http://test/documents', { method: 'POST', body: form });
    const response = await emulator.dispatchFetch(source.url, {
      method: 'POST',
      headers: [
        ...source.headers.entries(),
        ['X-Test-Permissions', `${permissions.company},${permissions.create}`],
      ],
      body: new Uint8Array(await source.arrayBuffer()),
    });
    expect(response.status).toBe(201);
    const document = documentSchema.parse(await response.json());
    expect(document.caseId).toBeUndefined();
    expect(document.fullName).toBe('');
  });
  it('saves a single case and never lists that document in another case', async () => {
    const response = await upload([caseId]);
    expect(response.status).toBe(201);
    const saved = documentSchema.parse(await response.json());
    expect(saved.title).toBe(generateDocumentTitle(new Date(saved.createdAt)));
    expect(saved.caseId).toBe(caseId);
    const headers = { 'X-Test-Permissions': permissions.company };
    const own = await emulator.dispatchFetch(`http://test/documents?caseId=${caseId}`, { headers });
    expect(
      documentListSchema.parse(await own.json()).documents.map((record) => record.id),
    ).toContain(saved.id);
    const other = await emulator.dispatchFetch(`http://test/documents?caseId=${otherCaseId}`, {
      headers,
    });
    expect(documentListSchema.parse(await other.json()).documents).toHaveLength(0);
    const reassigned = await emulator.dispatchFetch(`http://test/documents/${saved.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: otherCaseId }),
    });
    expect(reassigned.status).toBe(404);
    const stored = await emulator.dispatchFetch(`http://test/stored/${saved.id}`, { headers });
    expect(documentSchema.parse(await stored.json()).caseId).toBe(caseId);
  });
});
