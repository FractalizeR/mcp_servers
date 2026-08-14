import { z } from 'zod';

export const DeleteGridParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
});

export type DeleteGridParams = z.infer<typeof DeleteGridParamsSchema>;

export const DeleteGridOutputDataSchema = z.object({
  message: z.string(),
  recovery_token: z.string(),
});
