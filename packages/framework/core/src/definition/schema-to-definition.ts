/**
 * Генератор MCP definition из Zod схемы
 *
 * Основная функциональность для автоматической генерации definition
 * из Zod схемы, что исключает возможность несоответствия schema ↔ definition
 */

import type { z } from 'zod';
import { zodToMcpInputSchema } from './zod-json-schema-adapter.js';
import type { ToolInputSchema, ZodToJsonSchemaOptions } from './zod-json-schema-adapter.js';

/**
 * Опции для генерации definition из schema
 */
export interface SchemaToDefinitionOptions extends ZodToJsonSchemaOptions {
  /**
   * Кастомные трансформации для определенных полей
   *
   * Позволяет переопределить автоматически сгенерированное описание
   * для конкретных полей схемы
   *
   * @example
   * ```typescript
   * {
   *   customTransforms: {
   *     issueKey: (zodType) => ({
   *       type: 'string',
   *       description: 'Ключ задачи в формате QUEUE-123',
   *       pattern: '^[A-Z]+-\\d+$',
   *       examples: ['QUEUE-123', 'PROJECT-456']
   *     })
   *   }
   * }
   * ```
   */
  customTransforms?: Record<string, (zodType: z.ZodTypeAny) => Record<string, unknown>>;

  /**
   * Дополнительные descriptions для полей
   *
   * Используется для добавления descriptions к полям, если они не были
   * определены через .describe() в Zod схеме
   *
   * @example
   * ```typescript
   * {
   *   fieldDescriptions: {
   *     issueKey: 'Ключ задачи в формате QUEUE-123',
   *     fields: 'Массив полей для возврата'
   *   }
   * }
   * ```
   */
  fieldDescriptions?: Record<string, string>;
}

/**
 * Генерирует MCP definition inputSchema из Zod схемы
 *
 * Это основная функция для автоматической генерации definition,
 * которая полностью исключает возможность несоответствия schema ↔ definition.
 *
 * **Принцип работы:**
 * 1. Конвертирует Zod схему в JSON Schema (draft 2020-12) через нативный z.toJSONSchema
 * 2. Адаптирует результат для MCP протокола ($ref и $defs сохраняются как есть —
 *    2020-12 их поддерживает, и без $defs рекурсивные схемы (z.lazy) превращались
 *    бы в схему с битой ссылкой)
 * 3. Применяет кастомные трансформации и descriptions (если указаны)
 * 4. Возвращает готовый inputSchema для MCP definition
 *
 * @param schema - Zod схема параметров (z.object({ ... }))
 * @param options - Опциональные настройки генерации
 * @returns JSON Schema совместимый с MCP inputSchema
 *
 * @throws {Error} Если schema не является z.object()
 * @throws {Error} Если schema не имеет ни одного поля
 *
 * @example
 * ```typescript
 * // Базовое использование
 * const schema = z.object({
 *   issueKey: z.string().min(1).describe('Ключ задачи'),
 *   fields: z.array(z.string()).optional(),
 * });
 *
 * const inputSchema = generateDefinitionFromSchema(schema);
 * // Результат:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     issueKey: { type: 'string', minLength: 1, description: 'Ключ задачи' },
 * //     fields: { type: 'array', items: { type: 'string' } }
 * //   },
 * //   required: ['issueKey'],
 * //   additionalProperties: false
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // С кастомными descriptions
 * const schema = z.object({
 *   issueKey: z.string().min(1),
 *   transitionId: z.string(),
 *   comment: z.string().optional(),
 * });
 *
 * const inputSchema = generateDefinitionFromSchema(schema, {
 *   fieldDescriptions: {
 *     issueKey: 'Ключ задачи в формате QUEUE-123',
 *     transitionId: 'ID перехода статуса',
 *     comment: 'Комментарий при переходе (опционально)'
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // С кастомными трансформациями
 * const schema = z.object({
 *   issueKey: z.string(),
 *   priority: z.enum(['low', 'medium', 'high']),
 * });
 *
 * const inputSchema = generateDefinitionFromSchema(schema, {
 *   customTransforms: {
 *     priority: () => ({
 *       type: 'string',
 *       enum: ['low', 'medium', 'high'],
 *       description: '⚠️ Приоритет задачи (критичный параметр!)',
 *       examples: ['high', 'medium']
 *     })
 *   }
 * });
 * ```
 */
export function generateDefinitionFromSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  options?: SchemaToDefinitionOptions
): ToolInputSchema {
  // 1. Базовая конвертация через адаптер
  const inputSchema = zodToMcpInputSchema(schema, options);

  // 2. Применяем дополнительные descriptions (если указаны)
  if (options?.fieldDescriptions) {
    applyFieldDescriptions(inputSchema.properties, options.fieldDescriptions);
  }

  // 3. Применяем кастомные трансформации (если указаны)
  if (options?.customTransforms) {
    applyCustomTransforms(inputSchema.properties, options.customTransforms, schema);
  }

  return inputSchema;
}

/**
 * Применить дополнительные descriptions к полям
 * (только если description еще не установлен)
 */
function applyFieldDescriptions(
  properties: Record<string, unknown>,
  fieldDescriptions: Record<string, string>
): void {
  for (const [fieldName, description] of Object.entries(fieldDescriptions)) {
    const field = properties[fieldName];
    if (field && typeof field === 'object' && !('description' in field)) {
      (field as Record<string, unknown>)['description'] = description;
    }
  }
}

/**
 * Применить кастомные трансформации к полям
 * (полностью заменяет автоматически сгенерированное описание)
 */
function applyCustomTransforms(
  properties: Record<string, unknown>,
  customTransforms: Record<string, (zodType: z.ZodTypeAny) => Record<string, unknown>>,
  schema: z.ZodObject<z.ZodRawShape>
): void {
  const shape = schema.shape;

  for (const [fieldName, transform] of Object.entries(customTransforms)) {
    const zodType = shape[fieldName];
    if (zodType) {
      properties[fieldName] = transform(zodType as z.ZodTypeAny);
    }
  }
}
