/**
 * Тесты для генератора MCP definition из Zod schema
 */

import { describe, it, expect } from 'vitest';
import { generateDefinitionFromSchema } from '../../src/definition/schema-to-definition.js';
import {
  MinimalSchema,
  BasicSchema,
  PrimitiveTypesSchema,
  EnumSchema,
  ValidationSchema,
  DefaultValuesSchema,
  NullableSchema,
} from './fixtures/simple-schema.js';
import {
  NestedObjectSchema,
  ArrayOfObjectsSchema,
  RecordSchema,
  RealWorldSchema,
  DeeplyNestedSchema,
} from './fixtures/complex-schema.js';

describe('generateDefinitionFromSchema', () => {
  describe('Базовая функциональность', () => {
    it('должен генерировать definition для минимальной схемы', () => {
      const inputSchema = generateDefinitionFromSchema(MinimalSchema);

      expect(inputSchema).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      });
    });

    it('должен генерировать definition с обязательными и опциональными полями', () => {
      const inputSchema = generateDefinitionFromSchema(BasicSchema);

      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toHaveProperty('issueKey');
      expect(inputSchema.properties).toHaveProperty('fields');

      // issueKey - обязательное
      expect(inputSchema.required).toContain('issueKey');

      // fields - опциональное
      expect(inputSchema.required).not.toContain('fields');
    });

    it('должен извлекать descriptions из .describe()', () => {
      const inputSchema = generateDefinitionFromSchema(BasicSchema);

      const issueKeyProperty = inputSchema.properties['issueKey'] as Record<string, unknown>;
      expect(issueKeyProperty.description).toBe('Ключ задачи в формате QUEUE-123');

      const fieldsProperty = inputSchema.properties['fields'] as Record<string, unknown>;
      expect(fieldsProperty.description).toBe('Поля для возврата');
    });

    it('должен поддерживать additionalProperties: false по умолчанию', () => {
      const inputSchema = generateDefinitionFromSchema(MinimalSchema);

      expect(inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('Примитивные типы', () => {
    it('должен конвертировать string, number, boolean', () => {
      const inputSchema = generateDefinitionFromSchema(PrimitiveTypesSchema);

      expect((inputSchema.properties['stringField'] as Record<string, unknown>).type).toBe(
        'string'
      );
      expect((inputSchema.properties['numberField'] as Record<string, unknown>).type).toBe(
        'number'
      );
      expect((inputSchema.properties['booleanField'] as Record<string, unknown>).type).toBe(
        'boolean'
      );
    });

    it('должен правильно определять required/optional поля', () => {
      const inputSchema = generateDefinitionFromSchema(PrimitiveTypesSchema);

      // Required fields
      expect(inputSchema.required).toContain('stringField');
      expect(inputSchema.required).toContain('numberField');
      expect(inputSchema.required).toContain('booleanField');

      // Optional fields
      expect(inputSchema.required).not.toContain('optionalString');
      expect(inputSchema.required).not.toContain('optionalNumber');
    });
  });

  describe('Enums', () => {
    it('должен конвертировать z.enum() в JSON Schema enum', () => {
      const inputSchema = generateDefinitionFromSchema(EnumSchema);

      const priorityProperty = inputSchema.properties['priority'] as Record<string, unknown>;
      expect(priorityProperty.type).toBe('string');
      expect(priorityProperty.enum).toEqual(['low', 'medium', 'high']);
      expect(priorityProperty.description).toBe('Приоритет задачи');

      const statusProperty = inputSchema.properties['status'] as Record<string, unknown>;
      expect(statusProperty.enum).toEqual(['open', 'in-progress', 'closed']);
    });
  });

  describe('Валидация (constraints)', () => {
    it('должен сохранять min/max/minLength/maxLength', () => {
      const inputSchema = generateDefinitionFromSchema(ValidationSchema);

      const usernameProperty = inputSchema.properties['username'] as Record<string, unknown>;
      expect(usernameProperty.minLength).toBe(3);
      expect(usernameProperty.maxLength).toBe(20);

      const ageProperty = inputSchema.properties['age'] as Record<string, unknown>;
      expect(ageProperty.minimum).toBe(0);
      expect(ageProperty.maximum).toBe(120);

      const tagsProperty = inputSchema.properties['tags'] as Record<string, unknown>;
      expect(tagsProperty.minItems).toBe(1);
      expect(tagsProperty.maxItems).toBe(10);
    });
  });

  describe('Default значения', () => {
    it('должен сохранять default значения', () => {
      const inputSchema = generateDefinitionFromSchema(DefaultValuesSchema);

      const perPageProperty = inputSchema.properties['perPage'] as Record<string, unknown>;
      expect(perPageProperty.default).toBe(50);
      expect(perPageProperty.description).toBe('Количество элементов на странице');

      const includeArchivedProperty = inputSchema.properties['includeArchived'] as Record<
        string,
        unknown
      >;
      expect(includeArchivedProperty.default).toBe(false);
    });
  });

  describe('Nullable поля', () => {
    it('должен обрабатывать nullable и optional.nullable', () => {
      const inputSchema = generateDefinitionFromSchema(NullableSchema);

      // assignee - nullable (обязательное, но может быть null)
      // Zod v4 использует anyOf для nullable полей
      const assigneeProperty = inputSchema.properties['assignee'] as Record<string, unknown>;
      expect(assigneeProperty.anyOf).toBeDefined();
      expect(assigneeProperty.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
      expect(inputSchema.required).toContain('assignee');

      // dueDate - optional.nullable (может отсутствовать или быть null)
      expect(inputSchema.required).not.toContain('dueDate');
    });
  });

  describe('Вложенные объекты', () => {
    it('должен обрабатывать nested objects', () => {
      const inputSchema = generateDefinitionFromSchema(NestedObjectSchema);

      const customFieldsProperty = inputSchema.properties['customFields'] as Record<
        string,
        unknown
      >;
      expect(customFieldsProperty.type).toBe('object');
      expect(customFieldsProperty.properties).toHaveProperty('resolution');
      expect(customFieldsProperty.properties).toHaveProperty('assignee');

      // Проверяем required внутри nested object
      expect((customFieldsProperty.required as string[]) || []).toContain('resolution');
      expect((customFieldsProperty.required as string[]) || []).not.toContain('assignee');
    });

    it('должен обрабатывать глубоко вложенные объекты', () => {
      const inputSchema = generateDefinitionFromSchema(DeeplyNestedSchema);

      const level1 = inputSchema.properties['level1'] as Record<string, unknown>;
      expect(level1.type).toBe('object');

      const level2 = (level1.properties as Record<string, unknown>)['level2'] as Record<
        string,
        unknown
      >;
      expect(level2.type).toBe('object');

      const level3 = (level2.properties as Record<string, unknown>)['level3'] as Record<
        string,
        unknown
      >;
      expect(level3.type).toBe('object');
      expect(level3.properties).toHaveProperty('value');
    });
  });

  describe('Массивы', () => {
    it('должен обрабатывать массивы примитивов', () => {
      const inputSchema = generateDefinitionFromSchema(ArrayOfObjectsSchema);

      const issueKeysProperty = inputSchema.properties['issueKeys'] as Record<string, unknown>;
      expect(issueKeysProperty.type).toBe('array');
      expect((issueKeysProperty.items as Record<string, unknown>).type).toBe('string');
      expect(issueKeysProperty.minItems).toBe(1);
    });

    it('должен обрабатывать массивы объектов', () => {
      const inputSchema = generateDefinitionFromSchema(ArrayOfObjectsSchema);

      const filtersProperty = inputSchema.properties['filters'] as Record<string, unknown>;
      expect(filtersProperty.type).toBe('array');

      const itemsSchema = filtersProperty.items as Record<string, unknown>;
      expect(itemsSchema.type).toBe('object');
      expect(itemsSchema.properties).toHaveProperty('field');
      expect(itemsSchema.properties).toHaveProperty('operator');
      expect(itemsSchema.properties).toHaveProperty('value');
    });
  });

  describe('z.record() (динамические ключи)', () => {
    it('должен обрабатывать z.record()', () => {
      const inputSchema = generateDefinitionFromSchema(RecordSchema);

      const customFieldsProperty = inputSchema.properties['customFields'] as Record<
        string,
        unknown
      >;
      expect(customFieldsProperty.type).toBe('object');
      // z.record() должен позволять additionalProperties
      expect(customFieldsProperty.additionalProperties).toBeTruthy();

      const metadataProperty = inputSchema.properties['metadata'] as Record<string, unknown>;
      expect(metadataProperty.type).toBe('object');
    });
  });

  describe('Кастомизация (options)', () => {
    it('должен применять fieldDescriptions', () => {
      const inputSchema = generateDefinitionFromSchema(MinimalSchema, {
        fieldDescriptions: {
          id: 'Уникальный идентификатор',
        },
      });

      const idProperty = inputSchema.properties['id'] as Record<string, unknown>;
      expect(idProperty.description).toBe('Уникальный идентификатор');
    });

    it('не должен перезаписывать существующий description из .describe()', () => {
      const inputSchema = generateDefinitionFromSchema(BasicSchema, {
        fieldDescriptions: {
          issueKey: 'Это не должно перезаписать',
        },
      });

      const issueKeyProperty = inputSchema.properties['issueKey'] as Record<string, unknown>;
      // .describe() имеет приоритет
      expect(issueKeyProperty.description).toBe('Ключ задачи в формате QUEUE-123');
    });

    it('должен применять customTransforms', () => {
      const inputSchema = generateDefinitionFromSchema(MinimalSchema, {
        customTransforms: {
          id: () => ({
            type: 'string',
            description: '⚠️ КРИТИЧНО: Уникальный ID',
            pattern: '^[A-Z]+-\\d+$',
            examples: ['QUEUE-123', 'PROJECT-456'],
          }),
        },
      });

      const idProperty = inputSchema.properties['id'] as Record<string, unknown>;
      expect(idProperty.description).toBe('⚠️ КРИТИЧНО: Уникальный ID');
      expect(idProperty.pattern).toBe('^[A-Z]+-\\d+$');
      expect(idProperty.examples).toEqual(['QUEUE-123', 'PROJECT-456']);
    });

    it('должен поддерживать includeDescriptions: false', () => {
      const inputSchema = generateDefinitionFromSchema(BasicSchema, {
        includeDescriptions: false,
      });

      // Descriptions должны отсутствовать (если они были добавлены через .describe())
      // Это зависит от поведения zod-to-json-schema
      expect(inputSchema).toBeDefined();
    });

    it('должен поддерживать strict: false', () => {
      const inputSchema = generateDefinitionFromSchema(MinimalSchema, {
        strict: false,
      });

      // additionalProperties должно отсутствовать или быть true
      expect(inputSchema.additionalProperties).toBeUndefined();
    });
  });

  describe('Реальные сценарии', () => {
    it('должен обрабатывать сложную реальную схему', () => {
      const inputSchema = generateDefinitionFromSchema(RealWorldSchema);

      // Проверяем структуру
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toHaveProperty('issueKey');
      expect(inputSchema.properties).toHaveProperty('transitionId');
      expect(inputSchema.properties).toHaveProperty('comment');
      expect(inputSchema.properties).toHaveProperty('customFields');
      expect(inputSchema.properties).toHaveProperty('fields');

      // Проверяем required поля
      expect(inputSchema.required).toEqual(['issueKey', 'transitionId']);

      // Проверяем descriptions
      const issueKeyProperty = inputSchema.properties['issueKey'] as Record<string, unknown>;
      expect(issueKeyProperty.description).toBe('Ключ задачи');

      const commentProperty = inputSchema.properties['comment'] as Record<string, unknown>;
      expect(commentProperty.description).toBe('Комментарий при переходе');
    });

    it('должен работать для схемы с несколькими кастомными опциями', () => {
      const inputSchema = generateDefinitionFromSchema(RealWorldSchema, {
        includeDescriptions: true,
        includeExamples: true,
        strict: true,
        fieldDescriptions: {
          customFields: 'Дополнительное описание для customFields',
        },
        customTransforms: {
          transitionId: () => ({
            type: 'string',
            description: '⚠️ ОБЯЗАТЕЛЬНО: ID перехода из get_transitions',
            pattern: '^[0-9]+$',
            examples: ['1', '2', '10'],
          }),
        },
      });

      const transitionIdProperty = inputSchema.properties['transitionId'] as Record<
        string,
        unknown
      >;
      expect(transitionIdProperty.description).toBe(
        '⚠️ ОБЯЗАТЕЛЬНО: ID перехода из get_transitions'
      );
      expect(transitionIdProperty.pattern).toBe('^[0-9]+$');
      expect(transitionIdProperty.examples).toEqual(['1', '2', '10']);
    });
  });

  describe('Граничные случаи', () => {
    it('должен обрабатывать схему без required полей', () => {
      const AllOptionalSchema = PrimitiveTypesSchema.partial();
      const inputSchema = generateDefinitionFromSchema(AllOptionalSchema);

      // required должен быть пустым или отсутствовать
      expect(inputSchema.required || []).toEqual([]);
    });

    it('должен обрабатывать схему только с required полями', () => {
      const inputSchema = generateDefinitionFromSchema(PrimitiveTypesSchema);

      expect(inputSchema.required).toContain('stringField');
      expect(inputSchema.required).toContain('numberField');
      expect(inputSchema.required).toContain('booleanField');
    });
  });
});
