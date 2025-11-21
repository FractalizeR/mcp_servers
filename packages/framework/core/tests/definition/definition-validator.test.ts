/**
 * Тесты для валидатора соответствия Zod Schema ↔ MCP Definition
 */

import { describe, it, expect } from 'vitest';
import {
  validateSchemaDefinitionMatch,
  formatValidationResult,
  ValidationErrorType,
} from '../../src/definition/definition-validator.js';
import type { ToolInputSchema } from '../../src/definition/zod-json-schema-adapter.js';
import { BasicSchema, PrimitiveTypesSchema, EnumSchema } from './fixtures/simple-schema.js';
import { NestedObjectSchema, RecordSchema } from './fixtures/complex-schema.js';

describe('validateSchemaDefinitionMatch', () => {
  describe('Успешная валидация', () => {
    it('должен успешно валидировать соответствующие schema и definition', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string', minLength: 1 },
          fields: { type: 'array', items: { type: 'string' } },
        },
        required: ['issueKey'],
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('должен успешно валидировать все примитивные типы', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          stringField: { type: 'string' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          optionalString: { type: 'string' },
          optionalNumber: { type: 'number' },
        },
        required: ['stringField', 'numberField', 'booleanField'],
      };

      const result = validateSchemaDefinitionMatch(PrimitiveTypesSchema, definition);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('должен успешно валидировать enum', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
        },
        required: ['priority', 'status'],
      };

      const result = validateSchemaDefinitionMatch(EnumSchema, definition);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Ошибка: MISSING_PROPERTY', () => {
    it('должен обнаружить отсутствующее поле в definition.properties', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          // fields ОТСУТСТВУЕТ - это ошибка!
        },
        required: ['issueKey'],
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.MISSING_PROPERTY);
      expect(result.errors[0]?.field).toBe('fields');
      expect(result.errors[0]?.message).toContain(
        "Поле 'fields' присутствует в schema, но отсутствует в definition.properties"
      );
    });

    it('должен обнаружить несколько отсутствующих полей', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          stringField: { type: 'string' },
          // numberField, booleanField ОТСУТСТВУЮТ
        },
        required: ['stringField'],
      };

      const result = validateSchemaDefinitionMatch(PrimitiveTypesSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      const missingFields = result.errors
        .filter((e) => e.type === ValidationErrorType.MISSING_PROPERTY)
        .map((e) => e.field);
      expect(missingFields).toContain('numberField');
      expect(missingFields).toContain('booleanField');
    });
  });

  describe('Ошибка: EXTRA_PROPERTY', () => {
    it('должен обнаружить лишнее поле в definition.properties', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
          extraField: { type: 'string' }, // ЛИШНЕЕ поле
        },
        required: ['issueKey'],
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.EXTRA_PROPERTY);
      expect(result.errors[0]?.field).toBe('extraField');
      expect(result.errors[0]?.message).toContain(
        "Поле 'extraField' присутствует в definition.properties, но отсутствует в schema"
      );
    });
  });

  describe('Ошибка: REQUIRED_MISMATCH', () => {
    it('должен обнаружить обязательное поле, не указанное в definition.required', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
        },
        required: [], // issueKey ОТСУТСТВУЕТ в required - это ошибка!
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.REQUIRED_MISMATCH);
      expect(result.errors[0]?.field).toBe('issueKey');
      expect(result.errors[0]?.message).toContain(
        "Поле 'issueKey' обязательно в schema, но не указано в definition.required"
      );
    });

    it('должен обнаружить несколько обязательных полей без required', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          stringField: { type: 'string' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          optionalString: { type: 'string' },
          optionalNumber: { type: 'number' },
        },
        required: [], // ВСЕ обязательные поля отсутствуют!
      };

      const result = validateSchemaDefinitionMatch(PrimitiveTypesSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      const missingRequired = result.errors
        .filter((e) => e.type === ValidationErrorType.REQUIRED_MISMATCH)
        .map((e) => e.field);
      expect(missingRequired).toContain('stringField');
      expect(missingRequired).toContain('numberField');
      expect(missingRequired).toContain('booleanField');
    });
  });

  describe('Ошибка: OPTIONAL_MISMATCH', () => {
    it('должен обнаружить опциональное поле, указанное в definition.required', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
        },
        required: ['issueKey', 'fields'], // fields опциональное, но указано в required!
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.OPTIONAL_MISMATCH);
      expect(result.errors[0]?.field).toBe('fields');
      expect(result.errors[0]?.message).toContain(
        "Поле 'fields' опционально в schema, но указано в definition.required"
      );
    });
  });

  describe('Комплексные ошибки', () => {
    it('должен обнаружить несколько типов ошибок одновременно', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          // fields ОТСУТСТВУЕТ (MISSING_PROPERTY)
          extraField: { type: 'string' }, // ЛИШНЕЕ (EXTRA_PROPERTY)
        },
        required: ['extraField'], // extraField в required, но его нет в schema (OPTIONAL_MISMATCH)
        // issueKey обязательное, но НЕ в required (REQUIRED_MISMATCH)
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      const errorTypes = result.errors.map((e) => e.type);
      expect(errorTypes).toContain(ValidationErrorType.MISSING_PROPERTY); // fields
      expect(errorTypes).toContain(ValidationErrorType.EXTRA_PROPERTY); // extraField
      expect(errorTypes).toContain(ValidationErrorType.REQUIRED_MISMATCH); // issueKey
    });

    it('должен валидировать реальный баг из коммита de41f2c', () => {
      // Симуляция бага: fields обязательно в schema, но ОТСУТСТВУЕТ в definition
      const QueueFieldsSchema = BasicSchema; // Аналог GetQueueFieldsParamsSchema

      const buggyDefinition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' }, // queueId в реальном случае
          // fields ОТСУТСТВУЕТ - это реальный баг!
        },
        required: ['issueKey'], // fields НЕ в required!
      };

      const result = validateSchemaDefinitionMatch(QueueFieldsSchema, buggyDefinition);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.MISSING_PROPERTY);
      expect(result.errors[0]?.field).toBe('fields');
    });
  });

  describe('Вложенные объекты', () => {
    it('должен валидировать nested objects (без проверки внутренней структуры)', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          customFields: {
            type: 'object',
            properties: {
              resolution: { type: 'string' },
              assignee: { type: 'string' },
            },
            required: ['resolution'],
          },
        },
        required: ['issueKey'],
      };

      const result = validateSchemaDefinitionMatch(NestedObjectSchema, definition);

      // Валидатор проверяет только top-level поля
      expect(result.success).toBe(true);
    });
  });

  describe('z.record() (динамические ключи)', () => {
    it('должен валидировать z.record() как object', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          customFields: { type: 'object', additionalProperties: true },
          metadata: { type: 'object', additionalProperties: true },
        },
        required: ['issueKey'],
      };

      const result = validateSchemaDefinitionMatch(RecordSchema, definition);

      expect(result.success).toBe(true);
    });
  });

  describe('Граничные случаи', () => {
    it('должен обрабатывать definition без required (все optional)', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
        },
        // required отсутствует
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      // issueKey обязательное, но не в required
      expect(result.success).toBe(false);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.REQUIRED_MISMATCH);
    });

    it('должен обрабатывать пустой definition.required', () => {
      const definition: ToolInputSchema = {
        type: 'object',
        properties: {
          issueKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
        },
        required: [],
      };

      const result = validateSchemaDefinitionMatch(BasicSchema, definition);

      expect(result.success).toBe(false);
      expect(result.errors[0]?.type).toBe(ValidationErrorType.REQUIRED_MISMATCH);
    });
  });
});

describe('formatValidationResult', () => {
  it('должен форматировать успешный результат', () => {
    const result = {
      success: true,
      errors: [],
    };

    const formatted = formatValidationResult(result);

    expect(formatted).toBe('✅ Schema-Definition Match: OK');
  });

  it('должен форматировать результат с ошибками', () => {
    const result = {
      success: false,
      errors: [
        {
          type: ValidationErrorType.MISSING_PROPERTY,
          field: 'fields',
          message: "Поле 'fields' присутствует в schema, но отсутствует в definition.properties",
        },
        {
          type: ValidationErrorType.REQUIRED_MISMATCH,
          field: 'issueKey',
          message: "Поле 'issueKey' обязательно в schema, но не указано в definition.required",
        },
      ],
    };

    const formatted = formatValidationResult(result);

    expect(formatted).toContain('❌ Schema-Definition Mismatch (2 errors)');
    expect(formatted).toContain('[missing_property] fields');
    expect(formatted).toContain('[required_mismatch] issueKey');
  });

  it('должен форматировать результат с одной ошибкой', () => {
    const result = {
      success: false,
      errors: [
        {
          type: ValidationErrorType.EXTRA_PROPERTY,
          field: 'extraField',
          message:
            "Поле 'extraField' присутствует в definition.properties, но отсутствует в schema",
        },
      ],
    };

    const formatted = formatValidationResult(result);

    expect(formatted).toContain('❌ Schema-Definition Mismatch (1 errors)');
    expect(formatted).toContain('[extra_property] extraField');
  });
});
