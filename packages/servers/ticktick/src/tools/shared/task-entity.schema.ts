/**
 * Zod-схема сущности Task для outputSchema (пакет 3.1.C.ticktick)
 *
 * Зеркалит `Task`/`TaskWithUnknownFields` из `#ticktick_api/entities/task.entity.js`,
 * но НЕ переиспользует TS-интерфейс напрямую: entities в проекте описаны как
 * обычные TS-интерфейсы, Zod-схемы для них не заведены (проверено при
 * подготовке пакета — DTO/entity на Zod не найдены, см. отчёт пакета).
 *
 * Все поля опциональны, включая `id`/`title`/`createdTime`: `ResponseFieldFilter`
 * возвращает ПРОИЗВОЛЬНОЕ подмножество полей, заданное параметром `fields`
 * инструмента (может не включать даже `id`), поэтому outputSchema не может
 * требовать конкретный набор required-полей — иначе структурированный ответ с
 * узким `fields` не пройдёт валидацию по собственной документированной схеме.
 *
 * additionalProperties сознательно НЕ выставлен в false: `TaskWithUnknownFields`
 * прямо документирует, что TickTick API может вернуть недокументированные поля.
 */

import { z } from 'zod';

const ChecklistItemOutputSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: z.number(),
    sortOrder: z.number(),
  })
  .partial()
  .describe('Элемент чек-листа (подзадача)');

export const TaskEntityOutputSchema = z
  .object({
    id: z.string().describe('Идентификатор задачи'),
    projectId: z.string().describe('Идентификатор проекта, которому принадлежит задача'),
    title: z.string(),
    content: z.string(),
    desc: z.string(),
    priority: z.number().describe('0=none, 1=low, 3=medium, 5=high'),
    status: z.number().describe('0=uncompleted, 2=completed'),
    dueDate: z.string(),
    startDate: z.string(),
    timeZone: z.string(),
    isAllDay: z.boolean(),
    reminders: z.array(z.string()),
    repeatFlag: z.string(),
    tags: z.array(z.string()),
    items: z.array(ChecklistItemOutputSchema),
    progress: z.number(),
    completedTime: z.string(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    sortOrder: z.number(),
    kind: z.enum(['TEXT', 'CHECKLIST']),
  })
  .partial()
  .describe(
    'Задача TickTick. Набор полей зависит от параметра fields запроса ' +
      '(ResponseFieldFilter возвращает только запрошенные поля), поэтому ни одно ' +
      'поле не required. API может вернуть недокументированные поля.'
  );

export type TaskEntityOutput = z.infer<typeof TaskEntityOutputSchema>;
