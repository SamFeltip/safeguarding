import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { z } from 'zod';
import { createRuntime } from './runtime';

let emulator: Miniflare;
beforeAll(async () => {
  emulator = await createRuntime();
});
afterAll(async () => {
  await emulator.dispose();
});
describe('document access auditing', () => {
  it('persists who, when, target, status and request metadata for denied access', async () => {
    const id = crypto.randomUUID();
    const response = await emulator.dispatchFetch(`http://test/documents/${id}/pdf`, {
      headers: {
        'X-Test-Subject': 'auth0|bob',
        'User-Agent': 'audit-test',
        'CF-Connecting-IP': '192.0.2.1',
      },
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Request-ID')).toBeTruthy();
    const audit = await emulator.dispatchFetch('http://test/audit-records');
    const records = z
      .array(
        z.object({
          subject: z.string(),
          occurredAt: z.iso.datetime(),
          documentIds: z.array(z.string()),
          status: z.number(),
          requestId: z.uuid(),
          action: z.string(),
          userAgent: z.string(),
        }),
      )
      .parse(await audit.json());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      subject: 'auth0|bob',
      documentIds: [id],
      status: 404,
      action: 'pdf',
      userAgent: 'audit-test',
      requestId: response.headers.get('X-Request-ID'),
    });
  });
});
