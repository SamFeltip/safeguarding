import { seal } from '../shared/backup-crypto';

export async function saveEncrypted(
  bucket: R2Bucket,
  storageKey: string,
  data: ArrayBuffer,
  key: CryptoKey,
) {
  await bucket.put(storageKey, await seal(data, key, storageKey), {
    httpMetadata: { contentType: 'application/octet-stream' },
  });
}

export async function saveEncryptedJson(
  bucket: R2Bucket,
  storageKey: string,
  value: unknown,
  key: CryptoKey,
) {
  const data = await new Blob([JSON.stringify(value)]).arrayBuffer();
  await saveEncrypted(bucket, storageKey, data, key);
}
