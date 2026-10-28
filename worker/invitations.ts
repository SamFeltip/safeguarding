import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { invitationSchema } from '../shared/invitations';
import { provisionAccount, AccountConflict } from './provision-account';
import { sendPasswordSetup } from './password-setup';
import { persistAudit } from './audit-store';
import type { WorkerContext } from './context';

export const invitations = new Hono<WorkerContext>();
invitations.post('/', bodyLimit({ maxSize: 2048 }), async (context) => {
  const input = invitationSchema.safeParse(await context.req.json());
  if (!input.success) return context.json({ error: 'Enter an email and valid permissions.' }, 400);
  const { email, permissions } = input.data;
  await persistAudit(context.env.DOCUMENTS, {
    occurredAt: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    subject: context.get('identity').subject,
    action: 'invite-account',
    email,
    permissions,
  });
  try {
    await provisionAccount(context.env, input.data);
  } catch (error) {
    if (error instanceof AccountConflict) return context.json({ error: error.message }, 409);
    throw error;
  }
  await sendPasswordSetup(context.env, email);
  return context.json({ email, sent: true });
});
