/**
 * Test helper для проверки соответствия Zod Schema ↔ MCP Definition
 *
 * Предоставляет удобные функции для тестирования автогенерации definition из schema.
 * Используется в unit-тестах инструментов и smoke-тестах.
 */

import { expect } from 'vitest';
import type { z } from 'zod';
import {
  validateSchemaDefinitionMatch,
  formatValidationResult,
  type ValidationResult,
} from '@fractalizer/mcp-core/definition/definition-validator.js';
import type { ToolInputSchema } from '@fractalizer/mcp-core/definition/zod-json-schema-adapter.js';

/**
 * Проверить, что definition соответствует schema
 *
 * Использует vitest expect для проверки соответствия.
 * В случае ошибок выводит детальное форматированное сообщение.
 *
 * @param definition - MCP definition inputSchema
 * @param schema - Zod schema параметров
 *
 * @example
 * ```typescript
 * describe('GetPageTool', () => {
 *   it('должен генерировать корректный definition из schema', () => {
 *     const tool = new GetPageTool(mockFacade, mockLogger);
 *     const definition = tool.getDefinition();
 *
 *     // Проверяем, что definition соответствует schema
 *     expectDefinitionMatchesSchema(definition.inputSchema, GetPageSchema);
 *   });
 * });
 * ```
 */
export function expectDefinitionMatchesSchema<T extends z.ZodRawShape>(
  definition: ToolInputSchema,
  schema: z.ZodObject<T>
): void {
  const result = validateSchemaDefinitionMatch(schema, definition);

  if (!result.success) {
    const formattedMessage = formatValidationResult(result);
    expect.fail(
      `Schema-Definition mismatch detected:\n\n${formattedMessage}\n\nThis indicates that the MCP definition does not correctly represent the Zod schema.`
    );
  }

  // Успех - соответствие подтверждено
  expect(result.success).toBe(true);
}

/**
 * Проверить базовую корректность сгенерированного definition
 *
 * Выполняет базовые проверки структуры definition:
 * - type === 'object'
 * - properties определен и является объектом
 * - required определен и является массивом (если есть обязательные поля)
 *
 * @param definition - MCP definition inputSchema
 *
 * @example
 * ```typescript
 * it('должен генерировать валидный definition', () => {
 *   const definition = tool.getDefinition();
 *
 *   // Базовая проверка структуры
 *   validateGeneratedDefinition(definition.inputSchema);
 * });
 * ```
 */
export function validateGeneratedDefinition(definition: ToolInputSchema): void {
  // Проверяем тип
  expect(definition.type).toBe('object');

  // Проверяем, что properties определен
  expect(definition.properties).toBeDefined();
  expect(typeof definition.properties).toBe('object');

  // Проверяем, что required является массивом (если определен)
  if (definition.required !== undefined) {
    expect(Array.isArray(definition.required)).toBe(true);
  }

  // Проверяем, что каждое required поле существует в properties
  if (definition.required && definition.required.length > 0) {
    for (const requiredField of definition.required) {
      expect(definition.properties).toHaveProperty(requiredField);
    }
  }
}

/**
 * Выполнить полную проверку definition
 *
 * Комбинирует `validateGeneratedDefinition` и `expectDefinitionMatchesSchema`.
 * Рекомендуется использовать в smoke-тестах и критичных проверках.
 *
 * @param definition - MCP definition inputSchema
 * @param schema - Zod schema параметров
 *
 * @example
 * ```typescript
 * it('должен полностью валидировать definition', () => {
 *   const tool = new GetPageTool(mockFacade, mockLogger);
 *   const definition = tool.getDefinition();
 *
 *   // Полная проверка: структура + соответствие schema
 *   expectDefinitionFullyValid(definition.inputSchema, GetPageSchema);
 * });
 * ```
 */
export function expectDefinitionFullyValid<T extends z.ZodRawShape>(
  definition: ToolInputSchema,
  schema: z.ZodObject<T>
): void {
  // 1. Проверяем базовую структуру
  validateGeneratedDefinition(definition);

  // 2. Проверяем соответствие schema
  expectDefinitionMatchesSchema(definition, schema);
}

/**
 * Получить результат валидации без выбрасывания ошибки
 *
 * Удобно для тестов, которые проверяют negative cases или хотят
 * получить детали ошибок программно.
 *
 * @param definition - MCP definition inputSchema
 * @param schema - Zod schema параметров
 * @returns Результат валидации
 *
 * @example
 * ```typescript
 * it('должен обнаружить ошибку в definition', () => {
 *   const buggyDefinition = { ... };
 *   const result = getValidationResult(buggyDefinition, MySchema);
 *
 *   expect(result.success).toBe(false);
 *   expect(result.errors).toHaveLength(1);
 *   expect(result.errors[0].type).toBe(ValidationErrorType.MISSING_PROPERTY);
 * });
 * ```
 */
export function getValidationResult<T extends z.ZodRawShape>(
  definition: ToolInputSchema,
  schema: z.ZodObject<T>
): ValidationResult {
  return validateSchemaDefinitionMatch(schema, definition);
}
