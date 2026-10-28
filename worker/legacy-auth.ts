import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import type { WorkerContext } from './context';

export const legacyAuth = new Hono<WorkerContext>();
legacyAuth.post('/logout', (context) => {
  if (context.req.header('Origin') !== new URL(context.req.url).origin)
    return context.json({ error: 'Invalid request origin.' }, 403);
  for (const name of [
    '__Host-safeguarding',
    '__Host-safeguarding-pending',
    '__Host-safeguarding-passkey-setup',
  ]) {
    deleteCookie(context, name, { path: '/', secure: true });
  }
  return context.json({ signedOut: true });
});
legacyAuth.get('/callback', (context) => context.redirect('/'));
legacyAuth.all('*', (context) =>
  context.json(
    { error: 'Email-link sign-in has been retired. Use the secure sign-in screen.' },
    410,
  ),
);
