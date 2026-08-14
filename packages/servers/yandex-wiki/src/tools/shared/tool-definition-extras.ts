/**
 * Хелперы пакета 3.1.C.wiki для расширения ToolDefinition полями следующей
 * волны (title/outputSchema/annotations, контракт 3.1.B).
 *
 * `BaseTool.getDefinition()` (framework, вне этого пакета) не знает про эти
 * поля — они добавляются через переопределение `getDefinition()` в каждом
 * `*.tool.ts`, вызывающее `super.getDefinition()` и накладывающее extras.
 */

import { z } from 'zod';
import { zodToMcpInputSchema } from '@fractalizer/mcp-core';
import type { ToolDefinition, JsonObjectSchema, ToolAnnotations } from '@fractalizer/mcp-core';

/**
 * Опциональные поля ToolDefinition, добавляемые волной 3.1.C поверх
 * автогенерируемого definition.
 */
export interface ToolDefinitionExtras {
  title?: string;
  outputSchema?: JsonObjectSchema;
  annotations?: ToolAnnotations;
}

/**
 * Наложить title/outputSchema/annotations на базовый ToolDefinition.
 *
 * Поля добавляются только если заданы (не затирают base undefined-ом).
 */
export function withDefinitionExtras(
  base: ToolDefinition,
  extras: ToolDefinitionExtras
): ToolDefinition {
  return {
    ...base,
    ...(extras.title !== undefined && { title: extras.title }),
    ...(extras.outputSchema !== undefined && { outputSchema: extras.outputSchema }),
    ...(extras.annotations !== undefined && { annotations: extras.annotations }),
  };
}

/**
 * Построить outputSchema (JSON Schema 2020-12) из Zod-схемы поля `data`
 * success envelope.
 *
 * Контракт 3.1.B: `formatSuccess(data)` отдаёт `{ success: true, data }` и как
 * `structuredContent`, и как текстовый дубль. outputSchema обязан описывать
 * ИМЕННО эту форму (envelope), а не голый `data` — поэтому здесь схема данных
 * оборачивается в `{ success: literal(true), data }` перед конвертацией.
 *
 * Вложенные объекты (Page/Grid/Resource) намеренно НЕ `.strict()` — сущности
 * Wiki API несут произвольные неизвестные поля (`WithUnknownFields<T>`), и
 * JSON Schema без `additionalProperties: false` на вложенном уровне их не
 * отвергает. `additionalProperties: false` ставится только на верхнем уровне
 * envelope (ровно два ключа: success, data).
 */
export function buildOutputSchema<T extends z.ZodRawShape>(
  dataSchema: z.ZodObject<T>
): JsonObjectSchema {
  const envelopeSchema = z.object({
    success: z.literal(true),
    data: dataSchema,
  });

  return zodToMcpInputSchema(envelopeSchema) as JsonObjectSchema;
}
