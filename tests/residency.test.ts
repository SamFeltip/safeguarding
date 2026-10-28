import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../cloudflare.config';
import { assertEuMetadataBoundary, assertEuRegionalHostname } from '../scripts/residency-policy';
import { verifyCloudflareResidency } from '../scripts/cloudflare-residency';
import { ensureEuBucket } from '../scripts/eu-buckets';
import { inspect, run } from '../scripts/cloudflare-cli';
import { assertPrivateBuckets } from '../scripts/bucket-privacy';

vi.mock('../scripts/cloudflare-cli.ts', () => ({ inspect: vi.fn(), run: vi.fn() }));

const variables = {
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  CLOUDFLARE_ZONE_ID: 'b'.repeat(32),
  CLOUDFLARE_APP_HOSTNAME: 'records.example.com',
  CLOUDFLARE_API_TOKEN: 'test-only-token',
};
const boundary = { regions: 'eu', allow_out_of_region_access: false };
const regional = { hostname: variables.CLOUDFLARE_APP_HOSTNAME, region_key: 'eu' };
const envelope = (result: unknown) => Response.json({ success: true, result });
const request = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', request);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function validAccount() {
  request.mockResolvedValueOnce(envelope({ account: { id: variables.CLOUDFLARE_ACCOUNT_ID } }));
}

describe('EU deployment safeguards', () => {
  it('restricts storage and backup execution and disables unregionalized hostnames', () => {
    expect(config.worker.env.DOCUMENTS.jurisdiction).toBe('eu');
    expect(config.worker.env.BACKUPS.jurisdiction).toBe('eu');
    expect(config.worker.exports.BackupWorkflow.jurisdiction).toBe('eu');
    expect(config.worker.workersDev).toBe(false);
    expect(config.worker.previewUrls).toBe(false);
  });

  it('rejects absent, global, mixed-region and out-of-region log configurations', () => {
    for (const value of [
      undefined,
      {},
      { ...boundary, regions: 'global' },
      { ...boundary, regions: 'us' },
      { ...boundary, regions: 'eu,us' },
      { ...boundary, allow_out_of_region_access: true },
      { regions: 'eu' },
    ]) {
      expect(() => {
        assertEuMetadataBoundary(value);
      }).toThrow();
    }
    expect(() => {
      assertEuMetadataBoundary(boundary);
    }).not.toThrow();
    expect(() => {
      assertEuRegionalHostname({ ...regional, region_key: 'weur' }, regional.hostname);
    }).toThrow();
    expect(() => {
      assertEuRegionalHostname(regional, 'other.example.com');
    }).toThrow();
  });

  it('verifies the account boundary and hostname without changing account settings', async () => {
    validAccount();
    request.mockResolvedValueOnce(envelope(boundary)).mockResolvedValueOnce(envelope(regional));
    await verifyCloudflareResidency(variables);
    expect(request).toHaveBeenCalledTimes(3);
    expect(run).not.toHaveBeenCalled();
    for (const [, options] of request.mock.calls) expect(options?.method).toBeUndefined();
  });

  it('blocks a zone from a different account before any configuration changes', async () => {
    request.mockResolvedValueOnce(envelope({ account: { id: 'c'.repeat(32) } }));
    await expect(verifyCloudflareResidency(variables, true)).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('blocks deployment until the real account metadata boundary is EU-only', async () => {
    validAccount();
    request.mockResolvedValueOnce(envelope({ ...boundary, regions: 'us' }));
    await expect(verifyCloudflareResidency(variables, true)).rejects.toThrow('Metadata Boundary');
    expect(run).not.toHaveBeenCalled();
  });

  it('creates and verifies only a missing EU regional hostname', async () => {
    validAccount();
    request
      .mockResolvedValueOnce(envelope(boundary))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(envelope(regional));
    await verifyCloudflareResidency(variables, true);
    expect(run).toHaveBeenCalledExactlyOnceWith([
      'addressing',
      'regional-hostnames',
      'create',
      '--zone',
      variables.CLOUDFLARE_ZONE_ID,
      '--hostname',
      regional.hostname,
      '--region-key',
      'eu',
    ]);
  });

  it('does not treat denied API access as a missing resource', async () => {
    validAccount();
    request
      .mockResolvedValueOnce(envelope(boundary))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(verifyCloudflareResidency(variables, true)).rejects.toThrow('403');
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses to silently replace a global bucket with an empty EU bucket', () => {
    vi.mocked(inspect)
      .mockReturnValueOnce({ buckets: [] })
      .mockReturnValueOnce({ buckets: [{ name: 'documents' }] });
    expect(() => {
      ensureEuBucket('documents');
    }).toThrow('Migrate');
    expect(run).not.toHaveBeenCalled();
  });

  it('creates new buckets in the EU and verifies the returned jurisdiction', () => {
    vi.mocked(inspect)
      .mockReturnValueOnce({ buckets: [] })
      .mockReturnValueOnce({ buckets: [] })
      .mockReturnValueOnce({ name: 'documents', jurisdiction: 'eu' });
    ensureEuBucket('documents');
    expect(run).toHaveBeenCalledExactlyOnceWith([
      'r2',
      'buckets',
      'create',
      '--name',
      'documents',
      '--cf-r2-jurisdiction',
      'eu',
    ]);
  });

  it('follows pagination when locating an existing EU bucket', () => {
    vi.mocked(inspect)
      .mockReturnValueOnce({ buckets: [], cursor: 'next-page' })
      .mockReturnValueOnce({ buckets: [{ name: 'documents' }] })
      .mockReturnValueOnce({ name: 'documents', jurisdiction: 'eu' });
    ensureEuBucket('documents');
    expect(run).not.toHaveBeenCalled();
    expect(vi.mocked(inspect).mock.calls[1]?.[0]).toContain('next-page');
  });

  it('does not create storage after an inspection failure', () => {
    vi.mocked(inspect).mockImplementation(() => {
      throw new Error('Access denied');
    });
    expect(() => {
      ensureEuBucket('documents');
    }).toThrow('Access denied');
    expect(run).not.toHaveBeenCalled();
  });

  it('checks public access in the EU namespace', () => {
    vi.mocked(inspect).mockReturnValueOnce({ enabled: false }).mockReturnValueOnce({ domains: [] });
    assertPrivateBuckets(['documents']);
    for (const [arguments_] of vi.mocked(inspect).mock.calls) {
      expect(arguments_.slice(-2)).toEqual(['--cf-r2-jurisdiction', 'eu']);
    }
  });
});
