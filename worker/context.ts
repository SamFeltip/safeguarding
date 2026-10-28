import type { Identity } from '../shared/auth';
import type { OnboardingDocument } from '../shared/documents';
import type config from '../cloudflare.config';
import type { InferEnv } from 'cf/config';

export interface WorkerContext {
  Bindings: InferEnv<typeof config.worker>;
  Variables: {
    identity: Identity;
    document: OnboardingDocument;
    accessedDocumentIds?: string[];
    accessedPersonIds?: string[];
    accessedCaseIds?: string[];
  };
}
