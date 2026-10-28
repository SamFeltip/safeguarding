import type { ManagementEnvironment } from './auth0-management';
import { databaseConnection } from '../shared/auth.ts';

export async function sendPasswordSetup(environment: ManagementEnvironment, email: string) {
  const response = await fetch(
    `https://${environment.AUTH0_DOMAIN}/dbconnections/change_password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'Zl0n2i6EoUStoReM1KJkqsK01BPsVLvS',
        connection: databaseConnection,
        email,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error(`Sending password setup failed (${String(response.status)}).`);
}
