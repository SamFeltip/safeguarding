import { describe, expect, it } from 'vitest';
import app from '../worker/app';

describe('retired email-link authentication', () => {
  it('does not expose email login, sessions or custom passkey linking', async () => {
    for (const path of [
      '/api/auth/email',
      '/api/auth/session',
      '/api/auth/passkeys/start',
      '/api/auth/confirm',
    ]) {
      expect((await app.request(path, { method: 'POST' })).status).toBe(410);
    }
  });
  it('returns old callback links to the new sign-in page', async () => {
    const response = await app.request('/api/auth/callback?code=old&state=old');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
  });
  it('requires same-origin logout cleanup', async () => {
    expect(
      (
        await app.request('https://test/api/auth/logout', {
          method: 'POST',
          headers: { Origin: 'https://evil.example' },
        })
      ).status,
    ).toBe(403);
    const response = await app.request('https://test/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://test' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toHaveLength(3);
  });
});
