/**
 * `outputSchema` для инструментов, возвращающих коллекцию в режиме
 * ссылок/тел (пакет 5.1.B плана модернизации MCP 2026-07-28).
 *
 * Форма `data` — ОДНА и та же в обоих режимах (не discriminated union по
 * отдельным JSON Schema веткам): `items` присутствует в режиме `full`,
 * `resourceLinks` — в режиме `links`, оба поля опциональны в схеме, но
 * `formatCollectionResult()` (см. `format-collection-result.ts`) гарантирует
 * ровно одно из них непустым в каждом фактическом ответе. Такая форма — а
 * не `z.discriminatedUnion('mode', …)` — выбрана намеренно: топ-уровень,
 * который принимает `generateDefinitionFromSchema`, обязан быть
 * `z.ZodObject`, а плоский объект с опциональными полями проще читается в
 * JSON Schema (2020-12) клиентом, чем `oneOf` на верхнем уровне `data`.
 */

import { z } from 'zod';
import { buildOutputSchema } from '../../../definition/output-schema.js';
import type { JsonObjectSchema } from '../../base/base.types.js';

/** Zod-схема одного `resource_link` в `structuredContent` (без `type` — он не варьируется). */
export const ResourceLinkDataSchema = z.object({
  uri: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Собрать `outputSchema` инструмента-коллекции из Zod-схемы одного элемента
 * (используется в режиме `full`) и опциональной схемы сводки (`summary`).
 *
 * @param itemSchema - схема одного элемента коллекции (например, схема Issue)
 * @param summarySchema - опциональная схема поля `summary` (агрегаты: счётчики,
 *   фильтры, примененные к выборке — по усмотрению инструмента)
 */
export function buildCollectionOutputSchema<
  TItem extends z.ZodRawShape,
  TSummary extends z.ZodRawShape = z.ZodRawShape,
>(itemSchema: z.ZodObject<TItem>, summarySchema?: z.ZodObject<TSummary>): JsonObjectSchema {
  const dataSchema = z.object({
    mode: z.enum(['links', 'full']),
    itemsOnPage: z.number(),
    threshold: z.number(),
    ...(summarySchema ? { summary: summarySchema } : {}),
    items: z.array(itemSchema).optional(),
    resourceLinks: z.array(ResourceLinkDataSchema).optional(),
  });

  return buildOutputSchema(dataSchema);
}
