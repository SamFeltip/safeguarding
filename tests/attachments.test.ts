import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { createRuntime } from './runtime';
import { documentSchema, permissions } from '../shared/documents';
let emulator: Miniflare;
const member = [permissions.company, permissions.create];
const admin = [permissions.admin, permissions.create];
beforeAll(async () => {
  emulator = await createRuntime();
});
afterAll(async () => {
  await emulator.dispose();
});
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
function form() {
  const data = new FormData();
  data.set('onboarding', '{}');
  return data;
}
const validPdf = () => new File(['%PDF-1.7\n%%EOF'], 'offer.pdf', { type: 'application/pdf' });

describe('multiple PDF and image attachments', () => {
  it('validates and serves every attachment through document access checks', async () => {
    const data = form();
    data.append('attachments', validPdf());
    data.append(
      'attachments',
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], 'photo.png', {
        type: 'image/png',
      }),
    );
    const response = await request('/documents', member, { method: 'POST', body: data });
    expect(response.status).toBe(201);
    const saved = documentSchema.parse(await response.json());
    expect(saved.attachments).toHaveLength(2);
    for (const [index, type] of ['application/pdf', 'image/png'].entries()) {
      const path = `/documents/${saved.id}/attachments/${String(index)}`;
      const download = await request(path, member);
      expect(download.status).toBe(200);
      expect(download.headers.get('Content-Type')).toBe(type);
      expect(download.headers.get('Content-Disposition')).toContain('inline;');
      expect(download.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await request(path, [])).status).toBe(404);
    }
    expect((await request(`/documents/${saved.id}/attachments/2`, member)).status).toBe(404);
    expect((await request(`/documents/${saved.id}/attachments/01`, member)).status).toBe(404);
    await request(`/admin/documents/${saved.id}/access`, admin, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: 'admin' }),
    });
    expect((await request(`/documents/${saved.id}/attachments/1`, member)).status).toBe(404);
    expect((await request(`/documents/${saved.id}/attachments/1`, admin)).status).toBe(200);
  });
  it('rejects spoofed images, active SVG and too many attachments', async () => {
    for (const file of [
      new File(['fake'], 'photo.png', { type: 'image/png' }),
      new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' }),
    ]) {
      const data = form();
      data.append('attachments', file);
      expect((await request('/documents', member, { method: 'POST', body: data })).status).toBe(
        400,
      );
    }
    const data = form();
    for (let index = 0; index < 11; index++) data.append('attachments', validPdf());
    expect((await request('/documents', member, { method: 'POST', body: data })).status).toBe(400);
  });
});
