# EU data residency and encryption

The project configuration restricts application storage to the European Union.
The Auth0 canonical domain may be in either the EU (`*.eu.auth0.com`) or UK
(`*.uk.auth0.com`); the safeguarding tenant is in the UK.
The default strict deployment requires Enterprise Regional Services and an EU
Customer Metadata Boundary. On accounts without these features, explicitly setting
`CLOUDFLARE_RESIDENCY_MODE=best-effort` skips only those Enterprise checks and warns
that execution, TLS termination and metadata are not region-restricted. EU R2 and
Workflow jurisdiction/privacy checks remain mandatory. Best-effort mode disables
persisted Cloudflare observability logs and traces; detailed application audits stay
in EU R2. London placement is configured as a performance preference only.
This is a deployment requirement, not a claim that a live account has been configured.
Run `npm run security:residency` against the deployed account to verify the remote
bucket jurisdictions, bucket privacy, Workflow jurisdiction, Regional Services
hostname and Customer Metadata Boundary.

## What is configured

| Data or service                                                          | Control                                                                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Documents, PDFs, people, cases, access policies and detailed access logs | Private `safeguarding-documents` R2 bucket with `jurisdiction: eu`                 |
| Compressed encrypted backup objects, indexes and manifests               | Private `safeguarding-backups` R2 bucket with `jurisdiction: eu`                   |
| Backup job execution, parameters and step state                          | Backup Workflow export with `jurisdiction: eu`                                     |
| Web requests and API execution                                           | EU Regional Services on the application custom hostname                            |
| Cloudflare customer traffic metadata                                     | Account Customer Metadata Boundary set to `eu`, with out-of-region access disabled |
| Authentication                                                           | Deployment requires a canonical `*.eu.auth0.com` or `*.uk.auth0.com` tenant domain |

R2 encrypts all object contents and metadata at rest automatically with AES-256
using Cloudflare-managed keys. There is no R2 switch to enable this: it is always
on. Backups additionally retain the application's gzip-then-AES-256-GCM encryption
before upload, with the recovery key stored separately as a Worker secret.
R2 buckets remain private; Regional Services is attached to the **Worker hostname**,
never to a public R2 custom domain. Application API responses use `private, no-store`.
Full access records are persisted in EU R2; console logging only emits a request
correlation ID instead of duplicating identities, IPs and accessed object keys.

## Production setup

1. Sign in with `npx cf auth login`. Supply a scoped `CLOUDFLARE_API_TOKEN` through
   the shell or CI secret store for the deployment and verification commands. It
   needs the application's Worker/Workflow/R2 deployment permissions, Zone Read,
   Regional Services Edit, and account Logs Read. The Logs permission is needed
   for a read-only metadata-boundary check; the script does not change that boundary.
2. Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, and
   `CLOUDFLARE_APP_HOSTNAME` in `.env.local` or CI. The zone must belong to that
   account. The hostname must be a custom hostname in the zone. Set all Auth0
   variables to a matching EU tenant and register the production origin in Auth0.
   A custom Auth0 login domain alone does not prove tenant region; this setup
   requires the EU tenant's canonical domain instead.
3. Enable the required Data Localization Suite entitlement on the Cloudflare
   account. In account Settings / Configurations, set Customer Metadata Boundary
   to **EU**, with **Allow out-of-region access** disabled. This is an account-wide
   change; review its effect on other zones first. The script deliberately does
   not rewrite an account-wide setting on behalf of one project.
4. Run `npm run deploy`. It verifies the account and zone, reads the real metadata
   boundary, creates a missing EU regional hostname and verifies its region,
   creates missing buckets in the EU jurisdiction, verifies their jurisdictions
   and privacy, provisions the backup key, and deploys the Worker/custom domain
   and EU Workflow. An existing hostname in another region blocks deployment;
   change that hostname's Regional Services region to EU before retrying.
   Missing entitlements or permissions stop deployment rather than falling back.
5. Run `npm run security:residency` after deployment and after infrastructure
   changes. Worker `workers.dev` access and generated previews are disabled so
   they cannot provide an alternate unregionalized entry point. Extra command-line
   deployment overrides are rejected; keep the deployment settings in the config.

Workers dashboard logs/analytics have limitations with an EU metadata boundary.
The application's detailed access log remains in its private EU R2 bucket and is
included in backups independently of dashboard availability. Any future Logpush,
analytics, error-monitoring or telemetry integrations need their own residency review.

## Existing data and migration

Bucket jurisdictions cannot be changed in place. Deployment stops if a same-name
bucket exists in the default jurisdiction and the EU bucket does not exist. It
does not silently start the app with an empty EU bucket, copy data, or delete data.
Migrate existing objects and their HTTP/custom metadata to EU buckets, compare
counts and checksums, preserve access policies and all original backup keys, then
switch bindings after verification. Existing non-EU copies also need a deliberate
retention/deletion decision; changing bindings alone does not relocate them.

Workflow jurisdictions are also fixed at creation. An existing incompatible
Workflow requires a separately named EU Workflow and an explicit transition;
do not delete a Workflow to change region, since that also deletes its instances.
Preserve existing completed R2 backups and their recovery keys through the transition.

## Limits of this architecture

This cannot promise that **everything** remains in the EU. Cloudflare explicitly
states that Worker code and secrets are distributed globally even when execution
is regionalized. Workflow settings are also stored outside their selected
jurisdiction. Regional Services does not regionalize every outbound subrequest.
TLS private-key residency requires separate Geo Key Manager configuration and the
appropriate certificate/plan; it is not established by an EU R2 binding or hostname.
If code, secret material, TLS keys or control-plane settings must never leave the
EU, this Cloudflare architecture needs a separate platform/contract review.

Auth0's tenant data, logs, connections and subprocessors are outside Cloudflare's
configuration. Use an EU tenant and review its residency terms and any external
identity providers separately. The canonical domain check does not certify every
Auth0 service or third-party integration as EU-only.

Local development data, downloaded documents, restore outputs, offline recovery
keys and user devices are outside these Cloudflare controls. Use encrypted disks
and keep these copies in approved locations. Restores intentionally write plaintext
with restricted filesystem permissions; those permissions are not disk encryption.

## References

- [R2 jurisdiction restrictions](https://developers.cloudflare.com/r2/reference/data-location/)
- [R2 encryption at rest](https://developers.cloudflare.com/r2/reference/data-security/)
- [Workflow jurisdictions](https://developers.cloudflare.com/workflows/reference/data-location/)
- [Workers Regional Services and global code/secrets caveat](https://developers.cloudflare.com/data-localization/how-to/workers/)
- [Customer Metadata Boundary setup](https://developers.cloudflare.com/data-localization/metadata-boundary/get-started/)
- [Data Localization product compatibility](https://developers.cloudflare.com/data-localization/compatibility/)
