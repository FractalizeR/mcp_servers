import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DeletePageParamsSchema = z.object({
  idx: PageIdSchema,
});

export type DeletePageParams = z.infer<typeof DeletePageParamsSchema>;

export const DeletePageOutputDataSchema = z.object({
  message: z.string(),
  recovery_token: z.string(),
  hint: z.string(),
});
