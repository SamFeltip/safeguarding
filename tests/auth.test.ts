import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../worker/app';
import { authenticationPolicy } from '../shared/auth';

const issuer = 'https://test.auth0.com/';
const audience = 'https://api.example.com';
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  keys = await generateKeyPair('RS256');
});
afterEach(() => {
  vi.unstubAllGlobals();
});
async function token(
  overrides: {
    issuer?: string;
    audience?: string;
    expiration?: string;
    approved?: boolean;
    authenticated?: boolean;
    legacy?: boolean;
    subject?: string;
    canonical?: string;
  } = {},
) {
  const jwk = await exportJWK(keys.publicKey);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json({ keys: [{ ...jwk, kid: 'test', alg: 'RS256' }] }))),
  );
  return new SignJWT({
    permissions: ['read:documents:company'],
    'https://safeguarding.samfelton.com/approved': overrides.approved ?? true,
    'https://safeguarding.samfelton.com/authenticated': overrides.authenticated ?? true,
    ...(overrides.legacy
      ? {}
      : { 'https://safeguarding.samfelton.com/authentication-policy': authenticationPolicy }),
    ...(overrides.canonical
      ? { 'https://safeguarding.samfelton.com/subject': overrides.canonical }
      : {}),
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject(overrides.subject ?? 'auth0|alice')
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(overrides.expiration ?? '5m')
    .sign(keys.privateKey);
}
function me(bearer?: string) {
  return app.request(
    '/api/me',
    { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} },
    {
      AUTH0_DOMAIN: 'test.auth0.com',
      AUTH0_AUDIENCE: audience,
    },
  );
}
describe('Auth0 access token verification', () => {
  it('rejects unauthenticated and forged requests', async () => {
    expect((await me()).status).toBe(401);
    expect((await me('forged')).status).toBe(401);
  });
  it('accepts a signed RS256 token with the expected issuer and audience', async () => {
    const response = await me(await token());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      subject: 'auth0|alice',
      permissions: ['read:documents:company'],
    });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('rejects wrong issuers, wrong audiences and expired access tokens', async () => {
    for (const overrides of [
      { issuer: 'https://evil.example.com/' },
      { audience: 'wrong-api' },
      { expiration: '-1m' },
    ]) {
      expect((await me(await token(overrides))).status).toBe(401);
    }
  });
  it('rejects signed tokens without administrator approval or an allowed authentication method', async () => {
    for (const overrides of [{ approved: false }, { authenticated: false }]) {
      expect((await me(await token(overrides))).status).toBe(401);
    }
  });
  it('rejects old magic-link tokens and ignores retired cookies', async () => {
    expect((await me(await token({ legacy: true }))).status).toBe(401);
    expect((await me(await token({ subject: 'email|old' }))).status).toBe(401);
    expect(
      (await app.request('/api/me', { headers: { Cookie: '__Host-safeguarding=old-session' } }))
        .status,
    ).toBe(401);
  });
  it('preserves migrated record ownership using the administrator-controlled signed subject', async () => {
    const response = await me(await token({ canonical: 'email|original' }));
    expect(await response.json()).toEqual({
      subject: 'email|original',
      permissions: ['read:documents:company'],
    });
  });
});
