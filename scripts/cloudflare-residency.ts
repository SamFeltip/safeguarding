import { z } from 'zod';
import { dataJurisdiction } from '../shared/data-residency.ts';
import { inspect, run } from './cloudflare-cli.ts';
import {
  assertEuMetadataBoundary,
  assertEuRegionalHostname,
  residencyConfigurationSchema,
} from './residency-policy.ts';

export function assertEuWorkflow(name: string) {
  z.object({ jurisdiction: z.literal(dataJurisdiction) }).parse(
    inspect(['workflows', 'get', name]),
  );
}

export async function verifyCloudflareResidency(
  variables: Record<string, string>,
  configureHostname = false,
) {
  const configuration = residencyConfigurationSchema.parse(variables);
  const token = variables.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      'Supply CLOUDFLARE_API_TOKEN with Logs Read and Regional Services permissions.',
    );
  }
  const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_ZONE_ID: zoneId } = configuration;
  const hostname = configuration.CLOUDFLARE_APP_HOSTNAME;
  async function readApi(resource: string, allowMissing = false): Promise<unknown> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/${resource}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (allowMissing && response.status === 404) return undefined;
    if (!response.ok)
      throw new Error(`Cloudflare residency check failed (${String(response.status)}).`);
    return z.object({ success: z.literal(true), result: z.unknown() }).parse(await response.json())
      .result;
  }
  // A zone from another account must not be checked against this account's boundary.
  const zone = z.object({ account: z.object({ id: z.literal(accountId) }) });
  zone.parse(await readApi(`zones/${zoneId}`));
  assertEuMetadataBoundary(await readApi(`accounts/${accountId}/logs/control/cmb/config`));
  const resource = `zones/${zoneId}/addressing/regional_hostnames/${hostname}`;
  let regional = await readApi(resource, configureHostname);
  if (regional === undefined && configureHostname) {
    run([
      'addressing',
      'regional-hostnames',
      'create',
      '--zone',
      zoneId,
      '--hostname',
      hostname,
      '--region-key',
      dataJurisdiction,
    ]);
    regional = await readApi(resource);
  }
  assertEuRegionalHostname(regional, hostname);
}
