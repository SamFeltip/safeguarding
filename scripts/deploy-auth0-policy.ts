import { execFileSync } from 'node:child_process';
import { onExecutePostLogin } from './auth0-policy.ts';

// Auth0 validates a literal assignment; CommonJS bundler export getters are rejected.
const handler = onExecutePostLogin.toString();
const code =
  'exports.onExecutePostLogin = async function(event, api) ' +
  handler.slice(handler.indexOf('{')) +
  ';';
if (!code.startsWith('exports.onExecutePostLogin = async function(event, api)')) {
  throw new Error('Unexpected Action handler signature.');
}
const id = 'e6026010-a683-4c50-a350-fc365d51d508';
execFileSync(
  'auth0',
  [
    'actions',
    'update',
    id,
    '--data',
    JSON.stringify({
      code,
      name: 'Safeguarding password MFA or passkey',
      secrets: [],
    }),
  ],
  { stdio: 'pipe' },
);
execFileSync('auth0', ['api', 'post', `actions/actions/${id}/deploy`, '--data', '{}'], {
  stdio: 'pipe',
});
console.info('Deployed the literal async Post-Login Action.');
