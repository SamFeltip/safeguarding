import { z } from 'zod';

export const authConfigurationSchema = z.object({
  domain: z.hostname(),
  clientId: z.string().min(1),
  audience: z.url(),
});
export const identitySchema = z.object({
  subject: z.string(),
  permissions: z.array(z.string()),
});
export type Identity = z.infer<typeof identitySchema>;
