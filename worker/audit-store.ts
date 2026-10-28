export async function persistAudit(
  bucket: R2Bucket,
  record: Record<string, unknown> & { occurredAt: string; requestId: string },
) {
  const key = `audit/${record.occurredAt.slice(0, 10)}/${record.occurredAt}-${record.requestId}.json`;
  const saved = await bucket.put(key, JSON.stringify(record), {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json' },
  });
  if (!saved) throw new Error('Audit record collision.');
  // Detailed access records stay in the private EU data bucket.
  console.info(JSON.stringify({ event: 'access', requestId: record.requestId }));
}
