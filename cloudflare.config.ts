import { bindings, defineConfig, exports } from 'cf/config';
import { loadEnv } from 'vite';
import { dataJurisdiction } from './shared/data-residency.ts';

const variables = loadEnv('production', process.cwd(), '');

export default defineConfig({
  ...(variables.CLOUDFLARE_ACCOUNT_ID ? { accountId: variables.CLOUDFLARE_ACCOUNT_ID } : {}),
  worker: {
    name: 'safeguarding',
    entrypoint: './worker/index.ts',
    compatibilityDate: '2026-10-27',
    compatibilityFlags: ['nodejs_compat'],
    workersDev: false,
    previewUrls: false,
    placement: { region: 'aws:eu-west-2' },
    domains: variables.CLOUDFLARE_APP_HOSTNAME
      ? [{ hostname: variables.CLOUDFLARE_APP_HOSTNAME, production: true, previews: false }]
      : [],
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    env: {
      AUTH0_SERVICE_CLIENT_ID: bindings.secret(),
      AUTH0_SERVICE_CLIENT_SECRET: bindings.secret(),
      DOCUMENTS: bindings.r2({ name: 'safeguarding-documents', jurisdiction: dataJurisdiction }),
      BACKUPS: bindings.r2({ name: 'safeguarding-backups', jurisdiction: dataJurisdiction }),
      BACKUP_ENCRYPTION_KEY: bindings.secret(),
      BACKUP_JOBS: bindings.workflow({
        name: 'safeguarding-backups',
        worker: 'safeguarding',
        exportName: 'BackupWorkflow',
      }),
      AUTH0_DOMAIN: bindings.text(variables.AUTH0_DOMAIN ?? ''),
      AUTH0_AUDIENCE: bindings.text(variables.AUTH0_AUDIENCE ?? ''),
    },
    exports: {
      BackupWorkflow: exports.workflow({
        name: 'safeguarding-backups',
        jurisdiction: dataJurisdiction,
      }),
    },
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true, persist: variables.CLOUDFLARE_RESIDENCY_MODE !== 'best-effort' },
      traces: {
        enabled: true,
        headSamplingRate: 0.1,
        persist: variables.CLOUDFLARE_RESIDENCY_MODE !== 'best-effort',
      },
    },
  },
});
