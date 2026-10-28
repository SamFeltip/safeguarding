import { deploymentConfiguration } from './deployment-config.ts';
import { assertPrivateBuckets } from './bucket-privacy.ts';

const { documentsBucket, backupsBucket } = deploymentConfiguration();
assertPrivateBuckets([documentsBucket, backupsBucket]);
console.info('Data and backup bucket privacy verified.');
