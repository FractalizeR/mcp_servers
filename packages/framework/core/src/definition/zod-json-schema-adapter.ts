/**
 * Адаптер для конвертации Zod схем в JSON Schema (MCP-совместимый формат)
 *
 * Использует нативную функцию Zod v4 toJSONSchema для конверсии
 * и адаптирует результат для MCP протокола
 */

import { z } from 'zod';

/**
 * JSON Schema для MCP inputSchema
 *
 * Упрощенный формат без $schema и $ref (MCP не поддерживает)
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Опции для конвертации Zod → JSON Schema
 */
export interface ZodToJsonSchemaOptions {
  /**
   * Включить descriptions из .describe()
   * @default true
   */
  includeDescriptions?: boolean;

  /**
   * Добавить examples из метаданных Zod
   * @default true
   */
  includeExamples?: boolean;

  /**
   * Строгий режим (additionalProperties: false)
   * @default true
   */
  strict?: boolean;
}

/**
 * Конвертирует Zod схему в MCP-совместимый JSON Schema
 *
 * @param schema - Zod схема параметров (z.object({ ... }))
 * @param options - Опциональные настройки конверсии
 * @returns JSON Schema совместимый с MCP inputSchema
 *
 * @throws {Error} Если schema не является z.object()
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   issueKey: z.string().min(1).describe('Ключ задачи'),
 *   fields: z.array(z.string()).optional(),
 * });
 *
 * const inputSchema = zodToMcpInputSchema(schema);
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
 */
// eslint-disable-next-line complexity
export function zodToMcpInputSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  options?: ZodToJsonSchemaOptions
): ToolInputSchema {
  const { includeExamples = true, strict = true } = options ?? {};

  // 1. Конвертируем через нативный Zod v4 toJSONSchema
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-7', // MCP использует JSON Schema draft-7
    io: 'input', // Как в MCP SDK pipeStrategy: 'input'
  });

  // 2. Извлекаем только нужные поля для MCP
  const result = jsonSchema as {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };

  // 3. Валидация результата
  if (result.type !== 'object') {
    throw new Error(`Schema must be z.object(), got: ${result.type ?? 'undefined'}`);
  }

  if (!result.properties) {
    throw new Error('Schema must have at least one property');
  }

  // 4. Очистка от лишних полей (если нужно)
  if (!includeExamples) {
    removeExamplesFromSchema(result.properties);
  }

  // 5. Формируем финальный результат
  const inputSchema: ToolInputSchema = {
    type: 'object',
    properties: result.properties,
  };

  // Добавляем required только если массив не пустой
  if (result.required && result.required.length > 0) {
    inputSchema.required = result.required;
  }

  // Добавляем additionalProperties только если strict режим
  if (strict) {
    inputSchema.additionalProperties = false;
  }

  return inputSchema;
}

/**
 * Рекурсивно удаляет examples из JSON Schema
 * (используется если includeExamples: false)
 */
function removeExamplesFromSchema(properties: Record<string, unknown>): void {
  for (const prop of Object.values(properties)) {
    if (typeof prop === 'object' && prop !== null) {
      const schema = prop as Record<string, unknown>;

      // Удаляем examples на текущем уровне
      if ('examples' in schema) {
        delete schema['examples'];
      }

      // Рекурсивно обрабатываем вложенные объекты
      if (schema['properties'] && typeof schema['properties'] === 'object') {
        removeExamplesFromSchema(schema['properties'] as Record<string, unknown>);
      }

      // Рекурсивно обрабатываем items в массивах
      if (schema['items'] && typeof schema['items'] === 'object') {
        removeExamplesFromSchema({ items: schema['items'] });
      }
    }
  }
}

/**
 * Извлечь список required полей из Zod схемы
 *
 * @param schema - Zod схема параметров (z.object({ ... }))
 * @returns Массив имен обязательных полей
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   issueKey: z.string(),          // required
 *   transitionId: z.string(),      // required
 *   comment: z.string().optional(), // optional
 * });
 *
 * extractRequiredFields(schema); // ['issueKey', 'transitionId']
 * ```
 */
export function extractRequiredFields<T extends z.ZodRawShape>(schema: z.ZodObject<T>): string[] {
  // В Zod v4 используем toJSONSchema для получения required полей
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'draft-7',
    io: 'input',
  }) as { required?: string[] };

  return jsonSchema.required ?? [];
}
