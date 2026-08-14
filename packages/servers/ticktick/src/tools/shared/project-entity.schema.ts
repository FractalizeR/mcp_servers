/**
 * Zod-схема сущности Project для outputSchema (пакет 3.1.C.ticktick)
 *
 * Зеркалит `Project`/`ProjectWithUnknownFields` из
 * `#ticktick_api/entities/project.entity.js`. Все поля опциональны по той же
 * причине, что и в `task-entity.schema.ts`: `ResponseFieldFilter` может вернуть
 * произвольное подмножество полей. additionalProperties не ограничен —
 * `ProjectWithUnknownFields` допускает недокументированные поля API.
 */

import { z } from 'zod';

export const ProjectEntityOutputSchema = z
  .object({
    id: z.string().describe('Идентификатор проекта'),
    name: z.string(),
    color: z.string(),
    viewMode: z.enum(['list', 'kanban', 'timeline']),
    kind: z.enum(['TASK', 'NOTE']),
    groupId: z.string(),
    sortOrder: z.number(),
    closed: z.boolean(),
    modifiedTime: z.string(),
  })
  .partial()
  .describe(
    'Проект TickTick. Набор полей зависит от параметра fields запроса, поэтому ' +
      'ни одно поле не required. API может вернуть недокументированные поля.'
  );

export type ProjectEntityOutput = z.infer<typeof ProjectEntityOutputSchema>;
