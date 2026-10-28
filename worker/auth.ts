import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { MiddlewareHandler } from 'hono';
import type { WorkerContext } from './context';
import { authenticationPolicy } from '../shared/auth';

const keyResolvers = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function signingKeys(domain: string) {
  const issuer = `https://${domain}/`;
  let keys = keyResolvers.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL('.well-known/jwks.json', issuer));
    keyResolvers.set(issuer, keys);
  }
  return keys;
}

export const claimsSchema = z.object({
  sub: z.string().startsWith('auth0|'),
  permissions: z.array(z.string()).default([]),
  'https://safeguarding.samfelton.com/approved': z.literal(true),
  'https://safeguarding.samfelton.com/authenticated': z.literal(true),
  'https://safeguarding.samfelton.com/authentication-policy': z.literal(authenticationPolicy),
  'https://safeguarding.samfelton.com/subject': z
    .string()
    .regex(/^(?:email|auth0)\|.+$/u)
    .optional(),
});

export async function verifyAccessToken(domain: string, audience: string, token: string) {
  const issuer = `https://${domain}/`;
  const { payload } = await jwtVerify(token, signingKeys(domain), {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'exp', 'iat'],
  });
  return { ...claimsSchema.parse(payload), expiresAt: z.number().parse(payload.exp) * 1000 };
}

export const authenticate: MiddlewareHandler<WorkerContext> = async (context, next) => {
  const authorization = context.req.header('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    return context.json({ error: 'Sign in to access documents.' }, 401);
  }
  const { AUTH0_DOMAIN: domain, AUTH0_AUDIENCE: audience } = context.env;
  if (!domain || !audience) {
    return context.json({ error: 'Authentication is not configured.' }, 503);
  }
  try {
    const claims = await verifyAccessToken(domain, audience, token);
    context.set('identity', {
      subject: claims['https://safeguarding.samfelton.com/subject'] ?? claims.sub,
      permissions: claims.permissions,
    });
  } catch {
    context.header('WWW-Authenticate', 'Bearer error="invalid_token"');
    return context.json({ error: 'Your session expired. Please sign in again.' }, 401);
  }
  await next();
};
