import { authConfigurationSchema } from '../../shared/auth';

export const authConfiguration = authConfigurationSchema.safeParse({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
});
