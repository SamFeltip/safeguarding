import { z } from 'zod';

export const accountPermissions = [
  'create:documents',
  'read:documents:company',
  'read:documents:hr',
  'read:documents:all',
] as const;
export const invitationSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.trim().toLowerCase()),
  permissions: z.array(z.enum(accountPermissions)).min(1).max(4),
});
export const invitationResultSchema = z.object({ email: z.email(), sent: z.literal(true) });
export type Invitation = z.infer<typeof invitationSchema>;
