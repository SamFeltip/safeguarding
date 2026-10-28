# Code organization and review

## Review findings addressed

| Finding                                                                                                       | Change                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The new-document page mixed form layout, validation, networking, cache updates and navigation.                | `OnboardingForm` renders controls; `buildDocumentUpload` validates/packages input; `useCreateDocument` handles the mutation and resulting navigation.                        |
| The backup panel managed fetching, pagination, polling, lifecycle state and rendering.                        | `useBackups` owns the job lifecycle; `BackupPanel` renders its state and actions. Cache invalidation runs as a completion effect, not inside a query function.               |
| JSON requests and PDF downloads duplicated token/header/error handling.                                       | `useAuthenticatedRequest` is the authenticated transport. `useApi` adds response-schema validation, while PDF downloads consume the binary response.                         |
| Document detail and PDF endpoints duplicated authorization and document loading.                              | Both use `requireReadableDocument`, including ID validation, audit targets, current access-policy checks. Submission/storage logic has its own service.                      |
| Upload limits, employment types and UI labels could drift between call sites.                                 | Shared limits/schema constants define validation; one typed label map provides field and audience labels.                                                                    |
| Backup processing mixed pagination, object packaging, auditing and encryption, with six positional arguments. | Page orchestration, object handling and encrypted storage are separate modules. Named options replace ambiguous positional arguments. Backup paths are shared with recovery. |
| Deployment and standalone privacy checks duplicated configuration validation and CLI logic.                   | Shared configuration, bucket-privacy and key-management helpers keep the deploy entrypoint focused on ordering operations.                                                   |
| Identity hooks silently returned no permissions when used outside their provider.                             | Missing-provider usage now throws an explicit programming error.                                                                                                             |

## Where changes belong

- `src/pages/`: route-level composition and permission-dependent presentation.
- `src/components/`: UI and user interaction. `ui/` contains the shadcn primitives.
- `src/hooks/`: React Query lifecycle, authenticated transport and feature actions.
- `src/lib/`: browser helpers and pure form/label utilities.
- `shared/`: schemas, types, limits, backup format/crypto and storage paths shared
  across runtimes. Modules imported by native Node scripts use explicit `.ts` imports.
- `worker/documents.ts`, `worker/backups.ts`: HTTP route wiring and response handling.
- `worker/authorization.ts`, `worker/readable-document.ts`: reusable access checks.
- `worker/document-submission.ts`, `worker/storage.ts`: document creation and R2 storage.
- `worker/backup-*.ts`: durable orchestration, page/object processing and encryption/storage.
- `worker/audit*.ts`: request auditing and persistent audit writes.
- `scripts/`: local development, deployment prerequisites, key handling and offline recovery.

## Maintenance rules

Keep permission checks on the server. `/admin` is guarded in React and the access-policy
API requires admin permission. Store visibility overrides under `access/`; never rewrite
submitted document content to change permissions. New document-read routes should use the
existing readable-document middleware; hiding a button is not authorization.
Persist access records before returning data. Backup reads also record their
initiating admin, and encryption/compression must remain before R2 backup writes.

Keep derived React values derived instead of copying them into state. Query
functions fetch data; completion effects handle cache synchronization. Pass query
cancellation signals to transport so navigation can cancel obsolete requests.
Use runtime schemas at network/storage boundaries, and share validation limits
instead of duplicating numeric values in UI/server code.

Prefer named options for operations with several related parameters. Avoid adding
one-function abstractions without a distinct responsibility or real reuse. Keep
small, readable render blocks together instead of splitting solely to lower a
line count. Preserve the existing shadcn primitives rather than introducing a
second component library.

ESLint enforces at most four parameters and four nesting levels, alongside strict
TypeScript, Unicorn, Hooks/accessibility rules and the existing file/column limits.
Regression checks cover JWT validation, visibility, uploads, audit persistence,
compression/encryption, paginated R2 backups, Workflows and the recovery command.

## UI composition

Start with official shadcn/ui components whenever the library provides the pattern.
Use Empty for empty states, Field/FieldSet/FieldGroup for forms, Item for read-only
entries, Attachment for PDFs and CardAction for header actions. Do not recreate
these patterns with styled native elements. Semantic HTML for page structure is fine.

Theme customizations belong in the shadcn CSS variables in `src/index.css`.
Layout utilities and necessary component overrides are allowed; for example, document
values disable ItemDescription truncation so the entire submitted entry is readable.
Prefer component variants and slots before adding custom CSS or another widget.

Document access and backup tools live on the admin page, reached through the profile
avatar's shadcn DropdownMenu. Role assignments stay in Auth0. Page composition uses
large titles, breadcrumbs, grouped form fields and a record sidebar for hierarchy;
widgets remain official shadcn components.

People/case schemas live in `shared/records.ts`. `worker/records.ts` handles
creation and read routes; `worker/record-store.ts` validates relationships
and inherited access. `src/hooks/use-records.ts` owns record queries and creation;
`record-select` and `record-create-dialog` compose the shadcn controls. The document
form receives defaults and immutable association IDs from its route context.
