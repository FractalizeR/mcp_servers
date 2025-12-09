/**
 * Definition Generator Module
 *
 * Автоматическая генерация MCP definition из Zod schema
 *
 * Основная функциональность:
 * - Генерация inputSchema из Zod схемы (DRY принцип)
 * - Валидация соответствия schema ↔ definition
 * - Адаптер для конвертации Zod → JSON Schema
 *
 * @module @fractalizer/mcp-core/definition
 */

// Основной генератор
export {
  generateDefinitionFromSchema,
  type SchemaToDefinitionOptions,
} from './schema-to-definition.js';

// Адаптер для zod-to-json-schema
export {
  zodToMcpInputSchema,
  extractRequiredFields,
  type ToolInputSchema,
  type ZodToJsonSchemaOptions,
} from './zod-json-schema-adapter.js';

// Валидатор соответствия schema ↔ definition
export {
  validateSchemaDefinitionMatch,
  formatValidationResult,
  ValidationErrorType,
  type ValidationError,
  type ValidationResult,
} from './definition-validator.js';
