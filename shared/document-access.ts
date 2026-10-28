import { z } from 'zod';
import { audienceSchema } from './documents';

export const documentAccessSchema = z.strictObject({ audience: audienceSchema });
export const storedAccessSchema = documentAccessSchema.extend({
  updatedBy: z.string(),
  updatedAt: z.iso.datetime(),
});
