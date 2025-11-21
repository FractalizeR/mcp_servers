/**
 * Fixtures: Сложные Zod схемы для тестирования генератора definition
 */

import { z } from 'zod';

/**
 * Схема с вложенными объектами
 */
export const NestedObjectSchema = z.object({
  issueKey: z.string(),
  customFields: z
    .object({
      resolution: z.string().describe('Резолюция задачи'),
      assignee: z.string().optional().describe('Исполнитель'),
    })
    .optional(),
});

/**
 * Схема с массивами объектов
 */
export const ArrayOfObjectsSchema = z.object({
  issueKeys: z.array(z.string()).min(1),
  filters: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(['eq', 'ne', 'gt', 'lt']),
        value: z.string(),
      })
    )
    .optional(),
});

/**
 * Схема с z.record() (динамические ключи)
 */
export const RecordSchema = z.object({
  issueKey: z.string(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Сложная реальная схема (похожая на TransitionIssueParamsSchema)
 */
export const RealWorldSchema = z.object({
  issueKey: z.string().min(1).describe('Ключ задачи'),
  transitionId: z.string().min(1).describe('ID перехода'),
  comment: z.string().optional().describe('Комментарий при переходе'),
  customFields: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Кастомные поля для обновления'),
  fields: z.array(z.string().min(1)).optional().describe('Поля для возврата в ответе'),
});

/**
 * Глубоко вложенная схема (3 уровня)
 */
export const DeeplyNestedSchema = z.object({
  level1: z.object({
    level2: z.object({
      level3: z.object({
        value: z.string(),
      }),
    }),
  }),
});

/**
 * Схема с union типами
 * (может быть сложна для конверсии в JSON Schema)
 */
export const UnionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.union([z.literal('active'), z.literal('inactive')]),
});
