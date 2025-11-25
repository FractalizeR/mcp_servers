import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DeletePageParamsSchema = z.object({
  idx: PageIdSchema,
});

export type DeletePageParams = z.infer<typeof DeletePageParamsSchema>;
