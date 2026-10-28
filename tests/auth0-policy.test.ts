import { describe, expect, it, vi } from 'vitest';
import { onExecutePostLogin } from '../scripts/auth0-policy';
import { authenticationPolicy } from '../shared/auth';

const client = { client_id: 'Zl0n2i6EoUStoReM1KJkqsK01BPsVLvS' };
const connection = { strategy: 'auth0', name: 'safeguarding-members' };
function apiFixture() {
  return {
    access: { deny: vi.fn() },
    accessToken: { setCustomClaim: vi.fn() },
    multifactor: { enable: vi.fn() },
  };
}
function login(method: string) {
  return {
    client,
    connection,
    user: { app_metadata: { safeguarding_approved: true } },
    authentication: { methods: [{ name: method }] },
  };
}

describe('hosted database password MFA or passkey policy', () => {
  it('requires administrator approval before adding claims or requesting MFA', () => {
    const api = apiFixture();
    onExecutePostLogin({ ...login('pwd'), user: {} }, api);
    expect(api.access.deny).toHaveBeenCalledOnce();
    expect(api.accessToken.setCustomClaim).not.toHaveBeenCalled();
    expect(api.multifactor.enable).not.toHaveBeenCalled();
  });
  it('requires authenticator codes for password login with no remembered-browser bypass', () => {
    const api = apiFixture();
    onExecutePostLogin(login('pwd'), api);
    expect(api.multifactor.enable).toHaveBeenCalledExactlyOnceWith('google-authenticator', {
      allowRememberBrowser: false,
    });
    expect(api.accessToken.setCustomClaim).toHaveBeenCalledWith(
      'https://safeguarding.samfelton.com/authentication-policy',
      authenticationPolicy,
    );
    expect(api.access.deny).not.toHaveBeenCalled();
  });
  it('accepts actual passkeys without a separate OTP challenge', () => {
    const api = apiFixture();
    onExecutePostLogin(login('passkey'), api);
    expect(api.multifactor.enable).toHaveBeenCalledExactlyOnceWith('none');
    expect(api.accessToken.setCustomClaim).toHaveBeenCalledWith(
      'https://safeguarding.samfelton.com/authenticated',
      true,
    );
  });
  it('rejects legacy email, social and unrelated database authentication', () => {
    for (const other of [
      { strategy: 'email', name: 'email' },
      { strategy: 'google-oauth2', name: 'google' },
      { strategy: 'auth0', name: 'other-db' },
    ]) {
      const api = apiFixture();
      onExecutePostLogin({ ...login('pwd'), connection: other }, api);
      expect(api.access.deny).toHaveBeenCalledOnce();
      expect(api.accessToken.setCustomClaim).not.toHaveBeenCalled();
    }
  });
  it('requires the invited user to replace the bootstrap password', () => {
    for (const reset of [undefined, '2026-10-27T00:00:00Z']) {
      const api = apiFixture();
      onExecutePostLogin(
        {
          ...login('pwd'),
          user: {
            last_password_reset: reset,
            app_metadata: {
              safeguarding_approved: true,
              safeguarding_password_setup_after: '2026-10-28T00:00:00Z',
            },
          },
        },
        api,
      );
      expect(api.access.deny).toHaveBeenCalledOnce();
      expect(api.multifactor.enable).not.toHaveBeenCalled();
      expect(api.accessToken.setCustomClaim).not.toHaveBeenCalled();
    }
  });
  it('allows an owned password or existing passkey after administrative provisioning', () => {
    for (const method of ['pwd', 'passkey']) {
      const api = apiFixture();
      onExecutePostLogin(
        {
          ...login(method),
          user: {
            last_password_reset: '2026-10-28T01:00:00Z',
            app_metadata: {
              safeguarding_approved: true,
              safeguarding_password_setup_after: '2026-10-28T00:00:00Z',
              safeguarding_subject: 'email|original',
            },
          },
        },
        api,
      );
      expect(api.access.deny).not.toHaveBeenCalled();
      expect(api.accessToken.setCustomClaim).toHaveBeenCalledWith(
        'https://safeguarding.samfelton.com/subject',
        'email|original',
      );
    }
  });
  it('does not accept a factor name or an empty method list as a primary login', () => {
    for (const method of ['email', 'otp', 'mfa', '']) {
      const api = apiFixture();
      onExecutePostLogin(login(method), api);
      expect(api.access.deny).toHaveBeenCalledOnce();
    }
  });
  it('leaves unrelated applications alone', () => {
    const api = apiFixture();
    onExecutePostLogin({ ...login('pwd'), client: { client_id: 'unrelated' } }, api);
    expect(api.access.deny).not.toHaveBeenCalled();
    expect(api.multifactor.enable).not.toHaveBeenCalled();
  });
});
