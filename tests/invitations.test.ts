import { describe, expect, it, vi, afterEach } from 'vitest';
import { provisionAccount, AccountConflict } from '../worker/provision-account';
import { accountPermissions, invitationSchema } from '../shared/invitations';

const environment = {
  AUTH0_DOMAIN: 'tenant.uk.auth0.com',
  AUTH0_SERVICE_CLIENT_ID: 'service',
  AUTH0_SERVICE_CLIENT_SECRET: 'test-only-secret',
  AUTH0_AUDIENCE: 'https://test/api',
};
const email = 'invite@example.com';
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin account provisioning', () => {
  it('rejects arbitrary and empty permissions', () => {
    expect(invitationSchema.safeParse({ email, permissions: ['update:users'] }).success).toBe(
      false,
    );
    expect(invitationSchema.safeParse({ email, permissions: [] }).success).toBe(false);
  });
  it('creates a database user with a private bootstrap password and exact approved permissions', async () => {
    const responses = [
      { access_token: 'management-token' },
      [],
      { user_id: 'auth0|new', email, app_metadata: { safeguarding_approved: false } },
      [],
      null,
      { user_id: 'auth0|new', email },
    ];
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(responses.shift())));
    vi.stubGlobal('fetch', request);
    await provisionAccount(environment, { email, permissions: [...accountPermissions] });
    const created = request.mock.calls[2]?.[1]?.body;
    expect(created).toContain('"connection":"safeguarding-members"');
    expect(created).toContain('"password":');
    expect(created).toContain('safeguarding_password_setup_after');
    expect(created).toContain('"safeguarding_approved":false');
    expect(request.mock.calls[4]?.[0]).toContain('/permissions');
    expect(request.mock.calls[4]?.[1]?.body).toContain('read:documents:all');
    expect(request.mock.calls[5]?.[1]?.body).toContain('"safeguarding_approved":true');
  });
  it('does not silently change an existing account with different permissions', async () => {
    const responses = [
      { access_token: 'management-token' },
      [
        {
          user_id: 'auth0|existing',
          email,
          identities: [{ connection: 'safeguarding-members' }],
          app_metadata: { safeguarding_approved: true },
        },
      ],
      [
        {
          resource_server_identifier: environment.AUTH0_AUDIENCE,
          permission_name: 'read:documents:company',
        },
      ],
    ];
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(responses.shift())));
    vi.stubGlobal('fetch', request);
    await expect(
      provisionAccount(environment, { email, permissions: [...accountPermissions] }),
    ).rejects.toBeInstanceOf(AccountConflict);
    expect(request).toHaveBeenCalledTimes(3);
  });
});
