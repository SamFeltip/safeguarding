import { z } from 'zod';
import { inspect } from './cloudflare-cli.ts';
import { r2JurisdictionArguments } from '../shared/data-residency.ts';

export function assertPrivateBuckets(bucketNames: string[]) {
  for (const name of bucketNames) {
    const arguments_ = ['--bucket-name', name, ...r2JurisdictionArguments];
    const managed = z
      .object({ enabled: z.boolean() })
      .parse(inspect(['r2', 'buckets', 'domains', 'managed', 'list', ...arguments_]));
    const custom = z
      .object({ domains: z.array(z.unknown()) })
      .parse(inspect(['r2', 'buckets', 'domains', 'custom', 'list', ...arguments_]));
    if (managed.enabled || custom.domains.length > 0) {
      throw new Error(`Deployment blocked: ${name} must have no public access or custom domains.`);
    }
  }
}
