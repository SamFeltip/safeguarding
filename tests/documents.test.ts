import { seedCase } from './record-fixtures';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { buildDocumentUpload } from '../src/lib/document-upload';
import { createRuntime } from './runtime';
import { permissions } from '../shared/documents';
import { documentSchema, documentListSchema } from '../shared/documents';

let emulator: Miniflare;
let caseId: string;
beforeAll(async () => {
  emulator = await createRuntime();
  caseId = (await seedCase(emulator)).record.id;
});
afterAll(async () => {
  await emulator.dispose();
});

const member = [permissions.company, permissions.create];
const hr = [...member, permissions.hr];
const admin = [permissions.admin, permissions.create];
const employee = {
  title: 'New starter onboarding',
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
async function request(path: string, grants: string[], options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-Test-Permissions', grants.join(','));
  const source = new Request(`http://test${path}`, { ...options, headers });
  return emulator.dispatchFetch(source.url, {
    method: source.method,
    headers: [...source.headers.entries()],
    ...(source.body ? { body: new Uint8Array(await source.arrayBuffer()) } : {}),
  });
}
function form(audience = 'company', pdf?: File, extra: Record<string, unknown> = {}) {
  const data = new FormData();
  data.set('caseId', caseId);
  data.set('onboarding', JSON.stringify({ ...employee, audience, ...extra }));
  if (pdf) data.set('pdf', pdf);
  return data;
}
const validPdf = () =>
  new File(['%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'], 'offer.pdf', {
    type: 'application/pdf',
  });

function browserUpload() {
  const form = new FormData();
  for (const [name, value] of Object.entries(employee)) form.set(name, value);
  form.set('caseId', caseId);
  form.set('pdf', validPdf());
  return buildDocumentUpload(form);
}

describe('private, immutable documents on real local R2', () => {
  it('creates JSON and PDF, lists another user’s document, and downloads with safe headers', async () => {
    const response = await request('/documents', member, {
      method: 'POST',
      body: browserUpload(),
    });
    expect(response.status).toBe(201);
    const saved = documentSchema.parse(await response.json());
    expect(saved.title).toBe(employee.title);
    expect(saved.pdf?.sha256).toMatch(/^[a-f0-9]{64}$/u);
    const stored = await request(`/stored/${saved.id}`, member);
    const storedDocument = documentSchema.parse(await stored.json());
    expect(storedDocument.onboarding.fullName).toBe('Alex Morgan');
    expect(storedDocument.title).toBe(employee.title);
    const list = await request('/documents', member, {
      headers: { 'X-Test-Subject': 'auth0|bob' },
    });
    const listed = documentListSchema.parse(await list.json()).documents;
    expect(listed.find((item) => item.id === saved.id)?.title).toBe(employee.title);
    expect((await request(`/documents/${saved.id}`, member)).status).toBe(200);
    const download = await request(`/documents/${saved.id}/pdf`, member);
    expect(download.status).toBe(200);
    expect(download.headers.get('Content-Disposition')).toContain('attachment;');
    expect(download.headers.get('Cache-Control')).toBe('private, no-store');
    expect(download.headers.get('Content-Security-Policy')).toContain('sandbox');
    expect(await download.text()).toContain('%PDF-1.7');
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      expect((await request(`/documents/${saved.id}`, admin, { method })).status).toBe(404);
    }
  });

  it('hides HR documents and PDFs from members, even with a known ID', async () => {
    const response = await request('/documents', hr, {
      method: 'POST',
      body: form('hr', validPdf()),
    });
    const saved = documentSchema.parse(await response.json());
    const list = documentListSchema.parse(await (await request('/documents', member)).json());
    expect(list.documents.some((item) => item.id === saved.id)).toBe(false);
    expect((await request(`/documents/${saved.id}`, member)).status).toBe(404);
    expect((await request(`/documents/${saved.id}/pdf`, member)).status).toBe(404);
    expect((await request(`/documents/${saved.id}/pdf`, admin)).status).toBe(200);
    expect((await request(`/documents/${saved.id}`, hr)).status).toBe(200);
  });

  it('denies creation without permissions or for a higher-privilege audience', async () => {
    expect((await request('/documents', [], { method: 'POST', body: form() })).status).toBe(403);
    expect(
      (await request('/documents', member, { method: 'POST', body: form('admin') })).status,
    ).toBe(403);
    expect((await request('/documents', member, { method: 'POST', body: form('hr') })).status).toBe(
      403,
    );
  });

  it('rejects spoofed PDFs, oversized uploads, invalid fields and injected ACLs', async () => {
    const fake = new File(['<script>alert(1)</script>'], 'fake.pdf', { type: 'application/pdf' });
    expect(
      (await request('/documents', member, { method: 'POST', body: form('company', fake) })).status,
    ).toBe(400);
    const huge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    expect(
      (await request('/documents', member, { method: 'POST', body: form('company', huge) })).status,
    ).toBe(400);
    for (const extra of [
      { title: 'x'.repeat(201) },
      { startDate: '2026-02-30' },
      { allowedRoles: ['admin'] },
      { notes: 'x'.repeat(4001) },
    ]) {
      expect(
        (
          await request('/documents', member, {
            method: 'POST',
            body: form('company', undefined, extra),
          })
        ).status,
      ).toBe(400);
    }
  });
  it('derives initial visibility on the server rather than trusting a broader form audience', async () => {
    for (const [grants, audience] of [
      [hr, 'hr'],
      [admin, 'admin'],
    ] as const) {
      const response = await request('/documents', [...grants], { method: 'POST', body: form() });
      expect(response.status).toBe(201);
      expect(documentSchema.parse(await response.json()).audience).toBe(audience);
    }
  });

  it('lets only admins change visibility and applies changes to lists, JSON and PDFs', async () => {
    const created = await request('/documents', member, { method: 'POST', body: browserUpload() });
    const saved = documentSchema.parse(await created.json());
    const path = `/admin/documents/${saved.id}/access`;
    const update = (audience: string, grants: string[] = admin) =>
      request(path, grants, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience }),
      });
    expect((await update('admin', member)).status).toBe(403);
    expect((await update('admin', hr)).status).toBe(403);
    expect((await update('unknown')).status).toBe(400);
    expect((await update('admin')).status).toBe(200);
    for (const grants of [member, hr]) {
      const list = documentListSchema.parse(await (await request('/documents', grants)).json());
      expect(list.documents.some((item) => item.id === saved.id)).toBe(false);
      expect((await request(`/documents/${saved.id}`, grants)).status).toBe(404);
      expect((await request(`/documents/${saved.id}/pdf`, grants)).status).toBe(404);
    }
    const visible = documentSchema.parse(
      await (await request(`/documents/${saved.id}`, admin)).json(),
    );
    expect(visible.audience).toBe('admin');
    expect((await request(`/documents/${saved.id}/pdf`, admin)).status).toBe(200);
    const stored = documentSchema.parse(await (await request(`/stored/${saved.id}`, admin)).json());
    expect(stored).toEqual(saved);
    const records = z
      .array(
        z.object({
          action: z.string(),
          status: z.number(),
          subject: z.string(),
          documentIds: z.array(z.string()),
        }),
      )
      .parse(await (await request('/audit-records', admin)).json());
    expect(
      records.some(
        (record) =>
          record.action === 'access-policy' &&
          record.status === 200 &&
          record.subject === 'auth0|alice' &&
          record.documentIds.includes(saved.id),
      ),
    ).toBe(true);
    expect((await update('hr')).status).toBe(200);
    expect((await request(`/documents/${saved.id}/pdf`, hr)).status).toBe(200);
    expect((await request(`/documents/${saved.id}`, member)).status).toBe(404);
    expect((await update('company')).status).toBe(200);
    expect((await request(`/documents/${saved.id}`, member)).status).toBe(200);
    const list = documentListSchema.parse(await (await request('/documents', member)).json());
    expect(list.documents.find((item) => item.id === saved.id)?.audience).toBe('company');
    expect(
      (
        await request('/admin/documents/not-an-id/access', admin, {
          method: 'PUT',
          body: JSON.stringify({ audience: 'company' }),
        })
      ).status,
    ).toBe(404);
  });
});
