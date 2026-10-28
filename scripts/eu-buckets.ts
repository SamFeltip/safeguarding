import { z } from 'zod';
import { dataJurisdiction, r2JurisdictionArguments } from '../shared/data-residency.ts';
import { inspect, run } from './cloudflare-cli.ts';

const bucketPageSchema = z.object({
  buckets: z.array(z.object({ name: z.string() })),
  cursor: z.string().nullish(),
});

function bucketExists(name: string, jurisdiction?: string): boolean {
  let cursor: string | undefined;
  const visited = new Set<string>();
  do {
    const page = bucketPageSchema.parse(
      inspect([
        'r2',
        'buckets',
        'list',
        '--name-contains',
        name,
        ...(jurisdiction ? ['--cf-r2-jurisdiction', jurisdiction] : []),
        ...(cursor ? ['--cursor', cursor] : []),
      ]),
    );
    if (page.buckets.some((bucket) => bucket.name === name)) return true;
    cursor = page.cursor ?? undefined;
    if (cursor && visited.has(cursor)) throw new Error('R2 returned a repeated bucket cursor.');
    if (cursor) visited.add(cursor);
  } while (cursor);
  return false;
}

export function assertEuBucket(name: string) {
  const bucket = z.object({ name: z.literal(name), jurisdiction: z.literal(dataJurisdiction) });
  const result = bucket.safeParse(
    inspect(['r2', 'buckets', 'get', name, ...r2JurisdictionArguments]),
  );
  if (!result.success) throw new Error(`${name} must have an explicit EU jurisdiction.`);
}

export function ensureEuBucket(name: string) {
  if (!bucketExists(name, dataJurisdiction)) {
    if (bucketExists(name)) {
      throw new Error(
        `${name} already exists without EU residency. Migrate and verify its data before switching.`,
      );
    }
    run(['r2', 'buckets', 'create', '--name', name, ...r2JurisdictionArguments]);
  }
  assertEuBucket(name);
}
