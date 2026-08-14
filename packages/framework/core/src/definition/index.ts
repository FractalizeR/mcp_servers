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

// Детектор циклических $ref (JSON Schema 2020-12)
export { detectCircularRefs, type CircularRefCheckResult } from './detect-circular-refs.js';

// Единый хелпер success envelope / outputSchema (пакет 3.1.G — свод трёх
// параллельно изобретённых серверных хелперов в один, во framework)
export { successEnvelopeSchema, buildOutputSchema } from './output-schema.js';
