# Backups and recovery

Admins with the verified Auth0 API permission `read:documents:all` can create,
list and check backups in the Backups panel. All three API operations enforce
this permission. Non-admins receive 403 even if they know a backup ID.

`POST /api/backups` starts a Cloudflare Workflow and returns a job ID immediately.
The job continues if the browser closes. Each step reads at most 20 objects and
retries failures. The UI polls job status; completed backups remain listed in R2.
Workflow job status has Cloudflare's finite retention; the completed backup list
is independent of that retention.

## Coverage and format

Every object in the application data bucket uploaded by the job's start timestamp
is included: document JSON, PDFs, audit records, and any other application objects.
The source is append-only through the app, so later uploads are outside that
backup. Document/PDF reads performed by the backup are themselves audited with the
initiating admin and backup ID; those new log entries belong to a later snapshot.
Concurrent external changes/deletions cause the backup to fail rather than
silently skip an existing object. A late external insertion is not a transactional
R2 snapshot. Auth0 tenant users/configuration and Cloudflare infrastructure settings
are managed separately and are not objects in the application data bucket.

Backups all go into the single **private, EU-jurisdiction** `safeguarding-backups`
R2 bucket. The backup Workflow's instances also run and persist state in the EU.
All production CLI bucket/object operations, including recovery and key-safety
checks, explicitly select the EU jurisdiction. See [EU residency](data-residency.md)
for account prerequisites, migration requirements and platform limitations. For each
source object, the job packages the original key, HTTP/custom metadata, upload
time, ETag, size, SHA-256 checksum and bytes. It then:

1. Compresses the complete record with gzip.
2. Encrypts the compressed bytes with AES-256-GCM and a fresh random 96-bit nonce.
3. Uploads only the encrypted bytes, with the backup object path authenticated as
   additional data to detect relocated or substituted ciphertext.

Encrypted page indexes and a final encrypted manifest describe the complete backup.
The encrypted completion marker is written last; partial/failed jobs do not appear
as completed backups. Repeated step attempts can safely overwrite encrypted objects
inside their unique backup run, using a new nonce. Separate backups never overwrite
one another. Processing is bounded to one source object at a time, rather than
buffering the entire dataset. Objects above 16 MiB cause a failure; the app's own
uploads are limited to 10 MiB PDFs and small JSON/audit records.

## Keys

`npm run deploy` generates a random production encryption key on the first deploy,
saves it in `.backup-keys/production.key` (0600, ignored by Git), and uploads it as
the `BACKUP_ENCRYPTION_KEY` Cloudflare secret. Later deploys reuse that file. CI can
instead supply the 64-character hex key in its `BACKUP_ENCRYPTION_KEY` secret.
A missing local key is never regenerated if the remote backup bucket has objects.

**Keep an offline copy of the production key, separate from R2 and this computer.**
Without the original key, encrypted backups cannot be restored. Preserve old keys
if you deliberately rotate the secret; existing backups retain their original
key. Do not give this key to the browser, commit it, or store it in the backup bucket.

`npm run dev` generates a separate local key in `.dev.vars` when absent. Preserve
that key if you need to restore local development backups. Local data, Workflows
and encryption configuration are separate from production.

## Restore

Recovery requires a Cloudflare account administrator with permission to read the
backup bucket, plus the matching encryption key. Cloudflare credentials never go
through the browser. The app has no public backup download endpoint.

```sh
npx cf auth login
npm run backup:restore -- BACKUP_UUID ./restored-backups/BACKUP_UUID
```

The restore command reads the production key file, or `BACKUP_ENCRYPTION_KEY` from
the environment. It downloads the encrypted manifest, page indexes and objects,
authenticates/decrypts them, decompresses them, verifies each SHA-256 checksum and
the total count/byte size, and writes:

```text
restored-backups/BACKUP_UUID/
  manifest.json
  objects/                  # Original R2 keys and plaintext bytes
    documents/...
    attachments/...
    audit/...
  metadata/                 # Original HTTP/custom metadata for each key
```

The destination must be new: recovery never overwrites existing files or production
data. A successful run prints `Restored and verified ...`. A partial directory from
a failed run must not be treated as a complete recovery. Plaintext files are created
with mode 0600, directories with 0700. Treat the recovered data as confidential.
Reuploading is an explicit operator action; preserve the sidecar custom metadata,
which contains the original visibility fields. Restore `access/` policies too: they override
the original visibility for document lists, details and PDFs.

For an offline bucket copy with its original `runs/<id>/...` layout, set
`BACKUP_SOURCE_DIRECTORY` to the local root before running the same command. This
also supports local-development recovery by supplying its key through the process
environment. Automated tests exercise this exact restore command against a real
local R2/Workflow backup with documents, PDFs and audit records spanning pages.

Backups are admin-triggered; this setup does not schedule recurring backups or
automatically expire existing backup runs. Do not add a lifecycle rule that removes
partial runs independently of their manifest, or deletes backups before your
required retention period.
