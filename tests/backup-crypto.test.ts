import { describe, expect, it } from 'vitest';
import { backupKey, seal, unseal } from '../shared/backup-crypto';

const data = new Uint8Array(new TextEncoder().encode('Sensitive onboarding data. '.repeat(10_000)))
  .buffer;
describe('backup compression and authenticated encryption', () => {
  it('compresses before encryption and round trips without exposing plaintext', async () => {
    const key = await backupKey('11'.repeat(32));
    const encrypted = await seal(data, key, 'runs/example/object.enc');
    expect(encrypted.byteLength).toBeLessThan(data.byteLength / 10);
    expect(new TextDecoder().decode(encrypted)).not.toContain('Sensitive');
    expect(await unseal(encrypted.buffer, key, 'runs/example/object.enc')).toEqual(data);
    const another = await seal(data, key, 'runs/example/object.enc');
    expect(another).not.toEqual(encrypted);
  });
  it('rejects tampering, incorrect keys and moved ciphertext', async () => {
    const key = await backupKey('11'.repeat(32));
    const encrypted = await seal(data, key, 'original');
    await expect(
      unseal(encrypted.buffer, await backupKey('22'.repeat(32)), 'original'),
    ).rejects.toThrow();
    await expect(unseal(encrypted.buffer, key, 'moved')).rejects.toThrow();
    encrypted[20] = encrypted[20] ^ 1;
    await expect(unseal(encrypted.buffer, key, 'original')).rejects.toThrow();
    await expect(backupKey('weak-key')).rejects.toThrow();
  });
});
