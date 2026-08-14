/**
 * Zod-схема результата (для outputSchema) сущности Resource Wiki API.
 *
 * Зеркалирует `Resource`/`ResourceWithUnknownFields`
 * (`#wiki_api/entities/resource.entity.ts`). `item` — произвольная полезная
 * нагрузка (форма зависит от `type`), поэтому `z.unknown()`.
 */

import { z } from 'zod';

export const ResourceOutputSchema = z.object({
  item: z.unknown(),
  type: z.enum(['attachment', 'grid', 'sharepoint_resource']),
});

export type ResourceOutput = z.infer<typeof ResourceOutputSchema>;
