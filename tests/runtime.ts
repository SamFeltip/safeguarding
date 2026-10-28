import { Miniflare } from 'miniflare';
import { build } from 'esbuild';

export const testBackupSecret = 'ab'.repeat(32);
export async function createRuntime() {
  const bundle = await build({
    entryPoints: ['tests/fixture-worker.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['cloudflare:workers'],
  });
  const contents = bundle.outputFiles[0]?.text;
  if (!contents) throw new Error('Missing test bundle.');
  return new Miniflare({
    workers: [
      {
        config: {
          name: 'test',
          compatibilityDate: '2026-10-27',
          env: {
            DOCUMENTS: { type: 'r2', name: 'test-documents' },
            BACKUPS: { type: 'r2', name: 'test-backups' },
            BACKUP_ENCRYPTION_KEY: { type: 'text', value: testBackupSecret },
            BACKUP_JOBS: {
              type: 'workflow',
              name: 'test-backups',
              worker: 'test',
              exportName: 'BackupWorkflow',
            },
          },
          exports: { BackupWorkflow: { type: 'workflow', name: 'test-backups' } },
          manifest: {
            mainModule: 'index.js',
            modulesRoot: '/',
            modules: {
              'index.js': { type: 'esm', contents },
            },
          },
        },
      },
    ],
  });
}
