import { deploymentConfiguration } from './deployment-config.ts';
import { assertEuWorkflow, verifyCloudflareResidency } from './cloudflare-residency.ts';
import { assertEuBucket } from './eu-buckets.ts';
import { assertPrivateBuckets } from './bucket-privacy.ts';
import config from '../cloudflare.config.ts';

const { variables, documentsBucket, backupsBucket } = deploymentConfiguration();
await verifyCloudflareResidency(variables);
for (const bucket of [documentsBucket, backupsBucket]) assertEuBucket(bucket);
assertPrivateBuckets([documentsBucket, backupsBucket]);
assertEuWorkflow(config.worker.exports.BackupWorkflow.name);
console.info('EU buckets, Workflow, hostname, metadata boundary and bucket privacy verified.');
