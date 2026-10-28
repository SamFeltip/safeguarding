import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import config from '../cloudflare.config.ts';

function command(arguments_: string[]): unknown {
  const output = execFileSync('auth0', arguments_, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, AUTH0_AGENT_MODE: 'true' },
  });
  return output.trim() ? JSON.parse(output) : null;
}
const client = 'Zl0n2i6EoUStoReM1KJkqsK01BPsVLvS';
const connection = 'con_WchcuYb4rGSZhmgt';
const previous = z
  .object({ options: z.record(z.string(), z.unknown()) })
  .parse(command(['api', 'get', `connections/${connection}`]));
command([
  'api',
  'patch',
  `connections/${connection}`,
  '--data',
  JSON.stringify({
    options: {
      ...previous.options,
      disable_signup: true,
      authentication_methods: {
        password: { enabled: true, api_behavior: 'required', signup_behavior: 'allow' },
        passkey: { enabled: true },
      },
      passkey_options: {
        challenge_ui: 'both',
        progressive_enrollment_enabled: true,
        local_enrollment_enabled: true,
      },
    },
  }),
]);
command([
  'connections',
  'enabled-clients',
  'update',
  connection,
  '--data',
  JSON.stringify([{ client_id: client, status: true }]),
]);
command([
  'api',
  'patch',
  `clients/${client}`,
  '--data',
  JSON.stringify({
    callbacks: ['https://safeguarding.samfelton.com', 'http://localhost:5173'],
    allowed_logout_urls: ['https://safeguarding.samfelton.com', 'http://localhost:5173'],
    web_origins: ['https://safeguarding.samfelton.com', 'http://localhost:5173'],
    initiate_login_uri: 'https://safeguarding.samfelton.com',
    grant_types: ['authorization_code', 'refresh_token'],
    refresh_token: {
      rotation_type: 'rotating',
      expiration_type: 'expiring',
      token_lifetime: 86_400,
      idle_token_lifetime: 28_800,
      infinite_token_lifetime: false,
      infinite_idle_token_lifetime: false,
      leeway: 10,
    },
  }),
]);
const resourceServers = z
  .array(z.object({ id: z.string(), identifier: z.string(), name: z.string().optional() }))
  .parse(command(['api', 'get', 'resource-servers']));
const safeguardingApi = resourceServers.filter(
  (api) => api.identifier === config.worker.env.AUTH0_AUDIENCE.value,
);
if (safeguardingApi.length !== 1)
  throw new Error('Expected exactly one safeguarding API to configure offline access.');
command([
  'api',
  'patch',
  `resource-servers/${safeguardingApi[0]?.id ?? ''}`,
  '--data',
  JSON.stringify({ allow_offline_access: true }),
]);
for (const factor of ['otp', 'recovery-code'])
  command(['guardian', 'factors', 'set', factor, '--enabled']);
const policies = z.array(z.string()).parse(command(['api', 'get', 'guardian/policies']));
if (policies.length > 0)
  throw new Error(
    'Global MFA policy needs review before allowing passkeys without an extra challenge.',
  );
// Email-connection identities and history are retained; the retired service cannot sign them in.
command([
  'connections',
  'enabled-clients',
  'update',
  'con_jfTq8n78WhcP5GPs',
  '--data',
  JSON.stringify([
    { client_id: client, status: false },
    { client_id: 'uMs721TzSvLhDxMpPgoinPLiDV4ePdlg', status: false },
  ]),
]);
const updated = z
  .object({
    options: z.object({
      disable_signup: z.literal(true),
      authentication_methods: z.object({
        password: z.object({ enabled: z.literal(true) }),
        passkey: z.object({ enabled: z.literal(true) }),
      }),
    }),
  })
  .parse(command(['api', 'get', `connections/${connection}`]));
console.info(
  JSON.stringify({
    database: 'safeguarding-members',
    publicSignupDisabled: updated.options.disable_signup,
    passwordAndPasskeys: true,
    authenticatorCodesEnabled: true,
  }),
);
