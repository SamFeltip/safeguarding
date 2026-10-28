import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { MiddlewareHandler } from 'hono';
import type { WorkerContext } from './context';

const keyResolvers = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export const claimsSchema = z.object({
  sub: z.string().min(1),
  permissions: z.array(z.string()).default([]),
});

export const authenticate: MiddlewareHandler<WorkerContext> = async (context, next) => {
  const authorization = context.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return context.json({ error: 'Sign in to access documents.' }, 401);
  }
  const { AUTH0_DOMAIN: domain, AUTH0_AUDIENCE: audience } = context.env;
  if (!domain || !audience) {
    return context.json({ error: 'Authentication is not configured.' }, 503);
  }
  try {
    const issuer = `https://${domain}/`;
    let keys = keyResolvers.get(issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL('.well-known/jwks.json', issuer));
      keyResolvers.set(issuer, keys);
    }
    const { payload } = await jwtVerify(authorization.slice(7), keys, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    const claims = claimsSchema.parse(payload);
    context.set('identity', { subject: claims.sub, permissions: claims.permissions });
  } catch {
    context.header('WWW-Authenticate', 'Bearer error="invalid_token"');
    return context.json({ error: 'Your session expired. Please sign in again.' }, 401);
  }
  await next();
};
