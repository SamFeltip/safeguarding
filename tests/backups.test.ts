import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { z } from 'zod';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { backupKey, unseal, unpackRecord } from '../shared/backup-crypto';
import { backupManifestSchema, backupStatusSchema } from '../shared/backup-format';
import { personSchema, caseSchema } from '../shared/records';
import { documentSchema, permissions } from '../shared/documents';
import { createRuntime, testBackupSecret } from './runtime';

let emulator: Miniflare;
beforeAll(async () => {
  emulator = await createRuntime();
});
afterAll(async () => {
  await emulator.dispose();
});
function request(path: string, admin = true, method = 'GET') {
  return emulator.dispatchFetch(`http://test${path}`, {
    method,
    headers: { 'X-Test-Permissions': admin ? permissions.admin : permissions.company },
  });
}
async function encrypted(storageKey: string) {
  const response = await request(`/backup-object?key=${encodeURIComponent(storageKey)}`);
  expect(response.status).toBe(200);
  return response.arrayBuffer();
}
describe('admin-only compressed encrypted R2 backups', () => {
  it('denies non-admin backup creation, listing and status access', async () => {
    expect((await request('/backups', false, 'POST')).status).toBe(403);
    expect((await request('/backups', false)).status).toBe(403);
    expect((await request(`/backups/${crypto.randomUUID()}`, false)).status).toBe(403);
  });
  it('runs a durable backup and restores all snapshot objects with their metadata', async () => {
    const personResponse = await emulator.dispatchFetch('http://test/people', {
      method: 'POST',
      headers: {
        'X-Test-Permissions': `${permissions.admin},${permissions.create}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName: 'Alex Morgan', email: 'alex@example.com' }),
    });
    const person = personSchema.parse(await personResponse.json());
    const caseResponse = await emulator.dispatchFetch('http://test/cases', {
      method: 'POST',
      headers: {
        'X-Test-Permissions': `${permissions.admin},${permissions.create}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Onboarding', personId: person.id }),
    });
    const record = caseSchema.parse(await caseResponse.json());
    const form = new FormData();
    form.set('personId', person.id);
    form.set('caseId', record.id);
    form.set(
      'onboarding',
      JSON.stringify({
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        jobTitle: 'Engineer',
        department: 'Product',
        manager: 'Casey',
        startDate: '2026-11-01',
        employmentType: 'Full-time',
        location: 'London',
        equipment: 'Laptop',
        notes: '',
        audience: 'company',
      }),
    );
    form.set('pdf', new File(['%PDF-1.7\n%%EOF'], 'offer.pdf', { type: 'application/pdf' }));
    const sourceRequest = new Request('http://test/documents', { method: 'POST', body: form });
    const created = await emulator.dispatchFetch(sourceRequest.url, {
      method: 'POST',
      headers: [
        ...sourceRequest.headers.entries(),
        ['X-Test-Permissions', `${permissions.admin},${permissions.create}`],
      ],
      body: new Uint8Array(await sourceRequest.arrayBuffer()),
    });
    expect(created.status).toBe(201);
    const document = documentSchema.parse(await created.json());
    const policy = await emulator.dispatchFetch(
      `http://test/admin/documents/${document.id}/access`,
      {
        method: 'PUT',
        headers: { 'X-Test-Permissions': permissions.admin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: 'hr' }),
      },
    );
    expect(policy.status).toBe(200);
    for (let access = 0; access < 21; access += 1) {
      expect((await request(`/documents/${document.id}`)).status).toBe(200);
    }
    const source = z.array(z.string()).parse(await (await request('/source-keys')).json());
    expect(source).toEqual(
      expect.arrayContaining([`people/${person.id}.json`, `cases/${record.id}.json`]),
    );
    const started = await request('/backups', true, 'POST');
    expect(started.status).toBe(202);
    const { id } = backupStatusSchema.parse(await started.json());
    let status = '';
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await request(`/backups/${id}`);
      status = backupStatusSchema.parse(await response.json()).status;
      if (['complete', 'errored', 'terminated'].includes(status)) break;
      await setTimeout(50);
    }
    expect(status).toBe('complete');
    const key = await backupKey(testBackupSecret);
    const manifestKey = `runs/${id}/manifest.enc`;
    const ciphertext = await encrypted(manifestKey);
    expect(new TextDecoder().decode(ciphertext)).not.toContain('createdBy');
    const manifest = backupManifestSchema.parse(
      JSON.parse(new TextDecoder().decode(await unseal(ciphertext, key, manifestKey))),
    );
    expect(manifest.createdBy).toBe('auth0|alice');
    expect(manifest.pages).toBeGreaterThan(1);
    const files = new Map<string, ArrayBuffer>([[manifestKey, ciphertext]]);
    const restored: string[] = [];
    for (let page = 0; page < manifest.pages; page += 1) {
      const pageKey = `runs/${id}/pages/${String(page)}.enc`;
      const pageCiphertext = await encrypted(pageKey);
      files.set(pageKey, pageCiphertext);
      const entries = z
        .array(z.string())
        .parse(JSON.parse(new TextDecoder().decode(await unseal(pageCiphertext, key, pageKey))));
      for (const entry of entries) {
        const entryCiphertext = await encrypted(entry);
        files.set(entry, entryCiphertext);
        const record = await unpackRecord(await unseal(entryCiphertext, key, entry));
        expect(record.metadata.httpMetadata['content-type']).toMatch(/application\/(?:json|pdf)/u);
        restored.push(record.metadata.key);
      }
    }
    expect(restored).toEqual(expect.arrayContaining(source));
    expect(restored).toHaveLength(manifest.objects);
    const listed = await (await request('/backups')).text();
    expect(listed).toContain(id);
    const directory = mkdtempSync(path.join(tmpdir(), 'backup-restore-test-'));
    try {
      const downloadDirectory = path.join(directory, 'encrypted');
      for (const [storageKey, data] of files) {
        const file = path.join(downloadDirectory, storageKey);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, new Uint8Array(data));
      }
      const output = path.join(directory, 'restored');
      const restoredProcess = spawnSync(
        process.execPath,
        ['--experimental-strip-types', 'scripts/restore-backup.ts', id, output],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            BACKUP_ENCRYPTION_KEY: testBackupSecret,
            BACKUP_SOURCE_DIRECTORY: downloadDirectory,
          },
        },
      );
      expect(restoredProcess.stderr).toBe('');
      expect(restoredProcess.status).toBe(0);
      expect(
        readFileSync(path.join(output, 'objects', `attachments/${document.id}.pdf`), 'utf8'),
      ).toBe('%PDF-1.7\n%%EOF');
      expect(
        personSchema.parse(
          JSON.parse(
            readFileSync(path.join(output, 'objects', `people/${person.id}.json`), 'utf8'),
          ),
        ),
      ).toEqual(person);
      expect(
        caseSchema.parse(
          JSON.parse(readFileSync(path.join(output, 'objects', `cases/${record.id}.json`), 'utf8')),
        ),
      ).toEqual(record);
      expect(
        JSON.parse(
          readFileSync(path.join(output, 'objects', `access/${document.id}.json`), 'utf8'),
        ),
      ).toMatchObject({ audience: 'hr', updatedBy: 'auth0|alice' });
      expect(
        JSON.parse(
          readFileSync(path.join(output, 'objects', `documents/${document.id}.json`), 'utf8'),
        ),
      ).toMatchObject({
        id: document.id,
        fullName: 'Alex Morgan',
        personId: person.id,
        caseId: record.id,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15_000);
});
