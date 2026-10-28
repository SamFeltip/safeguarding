import { backupRecordSchema } from './backup-format.ts';
import type { BackupRecord } from './backup-format.ts';

const magic = new TextEncoder().encode('SGB1');
const encoder = new TextEncoder();
export async function backupKey(secret: string) {
  if (!/^[a-f0-9]{64}$/iu.test(secret)) throw new Error('A 256-bit backup key is required.');
  const bytes = Uint8Array.from(secret.match(/../gu) ?? [], (pair) => Number.parseInt(pair, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function digest(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function seal(bytes: ArrayBuffer, key: CryptoKey, storageKey: string) {
  const compressed = await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(storageKey),
      tagLength: 128,
    },
    key,
    compressed,
  );
  const result = new Uint8Array(16 + ciphertext.byteLength);
  result.set(magic);
  result.set(iv, 4);
  result.set(new Uint8Array(ciphertext), 16);
  return result;
}
export async function unseal(bytes: ArrayBuffer, key: CryptoKey, storageKey: string) {
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 4));
  if (bytes.byteLength < 32 || !header.every((byte, index) => byte === magic[index])) {
    throw new Error('Unsupported backup format.');
  }
  const compressed = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes.slice(4, 16),
      additionalData: encoder.encode(storageKey),
      tagLength: 128,
    },
    key,
    bytes.slice(16),
  );
  return new Response(
    new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer();
}
export function packRecord(metadata: BackupRecord, data: ArrayBuffer) {
  const header = encoder.encode(JSON.stringify(metadata));
  const payload = new Uint8Array(4 + header.byteLength + data.byteLength);
  new DataView(payload.buffer).setUint32(0, header.byteLength);
  payload.set(header, 4);
  payload.set(new Uint8Array(data), 4 + header.byteLength);
  return payload.buffer;
}
export async function unpackRecord(payload: ArrayBuffer) {
  const length = new DataView(payload).getUint32(0);
  if (length > 64 * 1024 || length + 4 > payload.byteLength)
    throw new Error('Invalid backup metadata.');
  const metadata = backupRecordSchema.parse(
    JSON.parse(new TextDecoder().decode(payload.slice(4, 4 + length))),
  );
  const data = payload.slice(4 + length);
  if (data.byteLength !== metadata.size || (await digest(data)) !== metadata.sha256) {
    throw new Error('Backup checksum mismatch.');
  }
  return { metadata, data };
}
