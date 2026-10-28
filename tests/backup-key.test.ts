import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, writeFileSync } from 'node:fs';
import { ensureBackupSecret } from '../scripts/backup-key';
import { inspect } from '../scripts/cloudflare-cli';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('../scripts/cloudflare-cli.ts', () => ({ inspect: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(existsSync).mockReturnValue(false);
});

describe('production backup key provisioning', () => {
  it('never replaces an explicitly configured missing recovery key', () => {
    expect(() =>
      ensureBackupSecret(
        {
          BACKUP_ENCRYPTION_KEY_FILE: '/private/missing-recovery.key',
        },
        'backups',
      ),
    ).toThrow('missing or empty');
    expect(inspect).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });
  it('supports the cf CLI array and API-envelope formats for an empty bucket', () => {
    for (const response of [[], { objects: [] }]) {
      vi.mocked(inspect).mockReturnValue(response);
      expect(ensureBackupSecret({}, 'backups')).toMatch(/^[a-f0-9]{64}$/u);
      expect(writeFileSync).toHaveBeenCalledWith(
        '.backup-keys/production.key',
        expect.stringMatching(/^[a-f0-9]{64}$/u),
        { flag: 'wx', mode: 0o600 },
      );
    }
  });

  it('never generates a replacement key for existing backups or malformed responses', () => {
    for (const response of [[{ key: 'existing' }], { objects: [{ key: 'existing' }] }, {}]) {
      vi.mocked(inspect).mockReturnValue(response);
      expect(() => ensureBackupSecret({}, 'backups')).toThrow();
      expect(writeFileSync).not.toHaveBeenCalled();
    }
  });
});
