import { z } from 'zod';

export const backupRecordSchema = z.object({
  key: z.string().min(1),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  uploaded: z.iso.datetime(),
  etag: z.string(),
  customMetadata: z.record(z.string(), z.string()),
  httpMetadata: z.record(z.string(), z.string()),
});
export type BackupRecord = z.infer<typeof backupRecordSchema>;
export const backupManifestSchema = z.object({
  version: z.literal(1),
  id: z.uuid(),
  createdBy: z.string(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  pages: z.number().int().nonnegative(),
  objects: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
});
export const backupStatusSchema = z.object({
  id: z.uuid(),
  status: z.string(),
});
export const backupListSchema = z.object({
  backups: z.array(z.object({ id: z.uuid(), completedAt: z.string() })),
  cursor: z.string().nullable(),
});
