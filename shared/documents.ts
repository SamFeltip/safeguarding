import { z } from 'zod';
import { uploadLimits } from './limits.ts';

export const audiences = ['company', 'hr', 'admin'] as const;
export const audienceSchema = z.enum(audiences);
export type Audience = z.infer<typeof audienceSchema>;
export const permissions = {
  create: 'create:documents',
  company: 'read:documents:company',
  hr: 'read:documents:hr',
  admin: 'read:documents:all',
} as const;

export const employmentTypes = ['Full-time', 'Part-time', 'Contractor'] as const;
const shortText = z.string().trim().min(1).max(uploadLimits.shortText);
const optionalTitle = z
  .string()
  .trim()
  .max(uploadLimits.shortText)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export function generateDocumentTitle(date = new Date()): string {
  return `Onboarding · ${date.toISOString().slice(0, 10)}`;
}

export const onboardingSchema = z.strictObject({
  title: optionalTitle,
  fullName: shortText,
  email: z.email().max(uploadLimits.email),
  jobTitle: shortText,
  department: shortText,
  manager: shortText,
  startDate: z.iso.date(),
  employmentType: z.enum(employmentTypes),
  location: shortText,
  equipment: z.string().trim().max(uploadLimits.equipment),
  notes: z.string().trim().max(uploadLimits.notes),
  audience: audienceSchema,
});
export type Onboarding = z.infer<typeof onboardingSchema>;

export const documentSummarySchema = z.object({
  id: z.uuid(),
  title: optionalTitle,
  fullName: z.string(),
  department: z.string(),
  jobTitle: z.string(),
  startDate: z.string(),
  createdAt: z.iso.datetime(),
  createdBy: z.string(),
  audience: audienceSchema,
  personId: z.uuid().optional(),
  caseId: z.uuid().optional(),
});
export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export const documentSchema = documentSummarySchema.extend({
  schemaVersion: z.literal(1),
  onboarding: onboardingSchema,
  pdf: z
    .object({
      name: z.string().max(uploadLimits.shortText),
      size: z.number().int().positive().max(uploadLimits.pdfBytes),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
      key: z.string(),
    })
    .optional(),
});
export type OnboardingDocument = z.infer<typeof documentSchema>;
export const documentListSchema = z.object({
  documents: z.array(documentSummarySchema),
  cursor: z.string().nullable(),
});

export function canRead(grants: readonly string[], audience: Audience): boolean {
  return grants.includes(permissions.admin) || grants.includes(permissions[audience]);
}

export function readableAudiences(grants: readonly string[]): Audience[] {
  return audiences.filter((audience) => canRead(grants, audience));
}
