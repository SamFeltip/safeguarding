import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { Miniflare } from 'miniflare';
import { createRuntime } from './runtime';
let runtime: Miniflare;
beforeAll(async () => {
  runtime = await createRuntime();
});
afterAll(async () => {
  await runtime.dispose();
});
describe('invitation endpoint authorization', () => {
  it('prevents company/HR users from provisioning accounts', async () => {
    for (const permissions of ['read:documents:company', 'read:documents:hr']) {
      const response = await runtime.dispatchFetch('http://test/admin/invitations', {
        method: 'POST',
        headers: {
          'X-Test-Permissions': permissions,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'invited@example.com', permissions: ['read:documents:all'] }),
      });
      expect(response.status).toBe(403);
    }
  });
  it('rejects invalid permissions even for an administrator', async () => {
    const response = await runtime.dispatchFetch('http://test/admin/invitations', {
      method: 'POST',
      headers: {
        'X-Test-Permissions': 'read:documents:all',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'invited@example.com', permissions: ['update:users'] }),
    });
    expect(response.status).toBe(400);
  });
});
