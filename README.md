# People records

React + Vite + TypeScript, shadcn/ui, Hono and Auth0. One Cloudflare Worker serves
the frontend and API. Documents, PDFs and audit records use a private R2 data
bucket; gzip-compressed, encrypted backups use a separate private R2 backup bucket.

Based on the [official Vite React + TypeScript template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts).
Components come from the [official shadcn/ui registry](https://ui.shadcn.com/docs/installation/vite).

## Development

Use Node.js 22.23+ or a supported newer LTS.

```sh
npm ci
cp .env.example .env.local
# Fill in the Auth0 configuration once.
npm run dev
```

`npm run dev` creates `.dev.vars` if needed, adds a separate local backup encryption
key, and runs Vite/Hono/Workflows/R2 together at <http://localhost:5173>. No separate
backend command, build or remote bucket setup is required. Existing `.dev.vars`
values are preserved; update them if you change Auth0 settings after first setup.
Without valid Auth0 settings the app cannot authenticate users; it never uses a
mock identity. Local state is separate from production.

## Auth0

1. Create a **Single Page Application**. Allow `http://localhost:5173` and your
   production HTTPS origin as callback URLs, logout URLs and allowed web origins.
2. Create an API with **RS256** signing and an identifier/audience such as
   `https://people.example.com/api`. Enable **RBAC** and **Add Permissions in the
   Access Token** on the API.
3. Create these permissions/roles and assign roles to approved users:

| Role     | Permissions                                                       | Visibility                |
| -------- | ----------------------------------------------------------------- | ------------------------- |
| `member` | `create:documents`, `read:documents:company`                      | Company                   |
| `hr`     | `create:documents`, `read:documents:company`, `read:documents:hr` | Company and HR            |
| `admin`  | `create:documents`, `read:documents:all`                          | All documents and backups |

4. Enable **New Universal Login**, **Identifier First**, and **Passkeys** on the
   Auth0-hosted database connection used by this SPA. Complete the prerequisites
   shown by Auth0, including domain configuration. Disable social/enterprise connections
   for this SPA and disable public database signups. Passkeys are enrolled/used on Auth0's UI.
5. Fill in `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`,
   `AUTH0_DOMAIN`, and `AUTH0_AUDIENCE` in `.env.local`. Browser/Worker domain and
   audience must match. Domains are hostnames without scheme or trailing slash.

App administrators invite accounts under **Admin settings → Accounts**, choosing
permissions before sending Auth0's standard password-setup email. The database
connection has public signup disabled. Users set their own password, sign in and
enroll an authenticator app; Universal Login also offers progressive passkey enrollment.
Subsequent sign-ins use a password plus an authenticator code, or a passkey.

The Post-Login Action requires administrative approval, the dedicated database
connection, and completed password setup for password users. It requires Auth0's
TOTP challenge before issuing tokens for a password login; passkeys do not need
an additional code. The API verifies the new signed authentication-policy claim,
RS256 signature, issuer, audience, expiry and permissions. Old magic-link tokens
and cookies cannot access the application.

Deploy the Action using `node --experimental-strip-types scripts/deploy-auth0-policy.ts`.
Configure hosted login with `scripts/configure-auth0-login.ts`. Account migration
preserves permissions and canonical record ownership without linking identities.
Tokens stay in the React SDK's memory cache. Domain records, PDFs, policies,
audits and encrypted backups remain in private EU R2. See
[authentication setup](docs/authentication.md).

[Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react),
[API RBAC](https://auth0.com/docs/get-started/apis/enable-role-based-access-control-for-apis),
[Universal Login passkeys](https://developer.auth0.com/resources/labs/authentication/implement-passwordless-login-with-passkeys).

## Deployment

```sh
npx cf auth login
npm run deploy
```

Before the first deploy, complete the [EU residency setup](docs/data-residency.md):
provide the account/zone IDs and application custom hostname, use an EU/UK Auth0
tenant, and enable the account's EU Customer Metadata Boundary. The scoped API
token needs Logs Read and Regional Services permissions as well as deployment access.

`npm run deploy` checks lint/format/types/tests, validates Auth0 settings and EU
residency controls, configures a missing EU regional hostname, creates missing
data and backup buckets in the EU jurisdiction, verifies that neither exposes
r2.dev/custom domains, creates/reuses the production backup key, and builds/deploys
the Worker and EU backup Workflow. No separate build or manual bucket creation is required.
An existing public bucket blocks deployment until its public access is removed.
Add the application custom origin to Auth0's application allowlists.
`workers.dev` and preview URLs are disabled. Run `npm run security:residency` to
verify the deployed controls. Existing global buckets require a verified migration.

R2 encrypts contents and metadata at rest automatically; backups additionally use
application-level encryption. Cloudflare still distributes Worker code/secrets
globally, and Workflow settings are not jurisdiction-bound: this architecture does
not guarantee EU-only residency for every platform/control-plane datum.

The Cloudflare CLI and Vite plugin use `cloudflare.config.ts`. `.env.local` or CI
environment variables supply Auth0 configuration. `VITE_*` settings are public,
bundled at build time; domain/audience are Worker text bindings. The generated
backup key is uploaded as a secret and never enters the browser bundle. CI also
needs scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` values. Keep an offline
copy of `.backup-keys/production.key` before relying on backups.

For accounts without Enterprise Data Localization, an explicit
`CLOUDFLARE_RESIDENCY_MODE=best-effort` permits deployment with EU R2 and Workflow
jurisdictions while skipping unavailable Regional Services/metadata-boundary checks.
It emits a warning, disables persisted Cloudflare logs/traces, and retains detailed
audit records in private EU R2. Worker placement targets London (`aws:eu-west-2`),
which is a preference, not a residency guarantee. Strict mode remains the default.

## Data and audit logs

- JSON/PDF contents are immutable. Document visibility (`company`, `hr`, `admin`)
  is managed in **Profile → Admin settings → Document access**. Only admins can
  change visibility; policies are stored separately under `access/` in private R2,
  audited and included in encrypted backups. Lists, JSON and PDFs enforce the
  current policy. New uploads default to the creator's most restricted readable
  audience, derived on the server. Auth0 tenant admins assign users' roles.
- Backups live in **Profile → Admin settings → Backups**, away from the document list.
- There are no edit/delete routes. Conditional R2 writes prevent JSON overwrites.
  Bucket administrators can still manage objects directly; this is application
  immutability, not a storage retention lock.
- Private PDF downloads pass through authenticated API checks and use attachment
  disposition, `nosniff`, sandbox CSP and no-store caching. Upload limits: 10 MiB
  per PDF/image, 10 attachments and 50 MiB combined, 16 KiB form JSON, 51 MiB total request. Signature/MIME/EOF checks are not
  malware scanning. Interrupted submissions can leave unreachable private PDFs.
- Every document list/detail/PDF request and backup request records timestamp,
  Auth0 subject, permissions, document IDs, action, HTTP method/path/status, request
  ID, duration, IP, user agent and Cloudflare Ray ID. Anonymous attempts have no
  subject. The app stores logs under `audit/` in the private data bucket and emits
  structured Worker logs. Tokens, form bodies and PDF contents are never logged.
- Reads fail closed with 503 if the audit record cannot be persisted. An audit
  entry describes an API request/response, not proof that a human read its contents.
  Logs have no automatic expiry; configure retention for your company requirements.
- R2 listing is paginated and follows object-key order. Restricted records are
  excluded; **Load more** may be needed after a page containing only restricted data.

## Backups

Admins use **Create backup** on the home page. A durable Cloudflare Workflow backs
up all application data present at the start, including audit records, compressing
with gzip and encrypting with AES-256-GCM before anything reaches the backup bucket.

See [backups and recovery](docs/backups.md) for format, keys, recovery, coverage and
operational limits. Restore command:

```sh
npm run backup:restore -- BACKUP_UUID ./restored-backups/BACKUP_UUID
```

## Commands and checks

| Command                         | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                   | Set up local bindings/key and start the complete app               |
| `npm run build`                 | Type-check and build for Cloudflare                                |
| `npm run deploy`                | Check, provision private resources, build and deploy               |
| `npm run preview`               | Preview a production build                                         |
| `npm run check`                 | ESLint, formatting, TypeScript and tests                           |
| `npm test`                      | JWT, audit, encryption, R2 and Workflow/recovery integration tests |
| `npm run security:bucket`       | Check both remote buckets for public access                        |
| `npm run backup:restore -- ...` | Decrypt, decompress and verify a backup                            |

Type-aware strict ESLint includes Unicorn, React Hooks and accessibility checks.
TypeScript files are limited to 250 nonblank/noncomment lines and 100 columns;
long string literals/URLs are permitted for upstream component classes. Prettier
also uses 100 columns. Tests verify real RS256 tokens, local R2/Workflows, role
isolation, uploads, auditing, compressed encryption/tamper rejection and the restore
command. A live Auth0 passkey flow still needs your configured tenant/browser.

See [code organization and review](docs/code-organization.md) for the responsibility
boundaries and maintenance guidelines.

## People and cases

People are standalone R2 records, separate from Auth0 accounts. Create them under
**People** without needing an email address. Cases can have zero or multiple people. **Cases** lists accessible cases;
`/people/:id` shows that person's cases and documents, while `/cases/:id` lists
its documents. Both pages provide **New document** with the relevant IDs selected
and available person details filled in. The main document form also lets you
select or create a person and case. All document fields and person/case links are optional. A selected person must be
attached to the selected case. Single-person cases provide the default person link.
Case people can be added or removed on the case page; submitted document links remain saved.

Person details provide defaults, not a live link to submitted field values.
Documents keep their submitted snapshots. The API validates record IDs, access
and the case/person relationship before writing a document or PDF.

People, cases and documents use the same role tiers. Admin settings includes
**People access** and **Case access** controls. A linked document requires access
to its person and case as well as its own policy. New records use the creator's
most restricted readable audience. Person/case reads, creation and policy changes
are audited. `people/`, `cases/` and their `access/` policies are included in the
existing compressed, encrypted backups and offline restoration.

The main document list and case document lists use the same responsive grids of shadcn cards at the A4 portrait ratio
(210:297). They show hierarchical document summaries, not PDF page thumbnails;
opening a card loads the complete authorized document.
