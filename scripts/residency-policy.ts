import { z } from 'zod';
import { dataJurisdiction } from '../shared/data-residency.ts';

export const residencyConfigurationSchema = z.object({
  CLOUDFLARE_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/u),
  CLOUDFLARE_ZONE_ID: z.string().regex(/^[a-f0-9]{32}$/u),
  CLOUDFLARE_APP_HOSTNAME: z
    .hostname()
    .refine(
      (hostname) => !hostname.endsWith('.workers.dev') && !hostname.endsWith('.workers.net'),
      'Use a custom hostname for EU Regional Services.',
    ),
});

export function assertEuMetadataBoundary(value: unknown) {
  const result = z
    .object({
      regions: z.literal(dataJurisdiction),
      allow_out_of_region_access: z.literal(false),
    })
    .safeParse(value);
  if (!result.success) {
    throw new Error(
      'Set the account Customer Metadata Boundary to eu with out-of-region access disabled.',
    );
  }
}

export function assertEuRegionalHostname(value: unknown, hostname: string) {
  const result = z
    .object({ hostname: z.literal(hostname), region_key: z.literal(dataJurisdiction) })
    .safeParse(value);
  if (!result.success) throw new Error('The application hostname must use EU Regional Services.');
}
