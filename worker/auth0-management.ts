import { z } from 'zod';
import type { WorkerContext } from './context';
import { databaseConnection } from '../shared/auth.ts';

export type AuthEnvironment = WorkerContext['Bindings'];
export type ManagementEnvironment = Pick<
  AuthEnvironment,
  'AUTH0_DOMAIN' | 'AUTH0_SERVICE_CLIENT_ID' | 'AUTH0_SERVICE_CLIENT_SECRET'
>;
const userSchema = z.object({
  user_id: z.string(),
  email: z.email(),
  identities: z.array(z.object({ connection: z.string() })).optional(),
  app_metadata: z
    .object({
      safeguarding_approved: z.boolean().optional(),
      safeguarding_pending_permissions: z.array(z.string()).optional(),
      safeguarding_password_setup_after: z.string().optional(),
      safeguarding_subject: z.string().optional(),
    })
    .optional(),
});

export async function auth0Request(
  environment: ManagementEnvironment,
  path: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`https://${environment.AUTH0_DOMAIN}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Auth0 request failed (${String(response.status)}).`);
  const value: unknown = await response.json();
  return value;
}

export async function management(environment: ManagementEnvironment) {
  const token = z.object({ access_token: z.string() }).parse(
    await auth0Request(environment, 'oauth/token', {
      grant_type: 'client_credentials',
      client_id: environment.AUTH0_SERVICE_CLIENT_ID,
      client_secret: environment.AUTH0_SERVICE_CLIENT_SECRET,
      audience: `https://${environment.AUTH0_DOMAIN}/api/v2/`,
    }),
  );
  return async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    const response = await fetch(`https://${environment.AUTH0_DOMAIN}/api/v2/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Account service failed (${String(response.status)}).`);
    return response.status === 204 ? null : response.json();
  };
}

export async function databaseAccount(environment: ManagementEnvironment, email: string) {
  const request = await management(environment);
  const users = z
    .array(userSchema)
    .parse(await request(`users-by-email?email=${encodeURIComponent(email)}`));
  return {
    request,
    user: users.find(
      (user) =>
        user.user_id.startsWith('auth0|') &&
        user.identities?.some((identity) => identity.connection === databaseConnection),
    ),
  };
}

export { userSchema };
