import { z } from 'zod';
import { audienceSchema } from './documents';
import { uploadLimits } from './limits';

const text = z.string().trim().max(uploadLimits.shortText);
export const personInputSchema = z.strictObject({
  fullName: text.min(1),
  email: z.email().max(uploadLimits.email),
  jobTitle: text.default(''),
  department: text.default(''),
  manager: text.default(''),
  location: text.default(''),
});
const recordFields = {
  id: z.uuid(),
  audience: audienceSchema,
  createdAt: z.iso.datetime(),
  createdBy: z.string(),
};
export const personSchema = personInputSchema.extend(recordFields);
export const caseInputSchema = z.strictObject({ title: text.min(1), personId: z.uuid() });
export const caseSchema = caseInputSchema.extend(recordFields);
export const peopleListSchema = z.object({
  people: z.array(personSchema),
  cursor: z.string().nullable(),
});
export const casesListSchema = z.object({
  cases: z.array(caseSchema),
  cursor: z.string().nullable(),
});
export const documentLinksSchema = z.strictObject({
  personId: z.uuid().optional(),
  caseId: z.uuid().optional(),
});
export const newDocumentLinksSchema = documentLinksSchema.required({ caseId: true });
export type NewDocumentLinks = z.infer<typeof newDocumentLinksSchema>;
export type Person = z.infer<typeof personSchema>;
export type CaseRecord = z.infer<typeof caseSchema>;
export type DocumentLinks = z.infer<typeof documentLinksSchema>;
