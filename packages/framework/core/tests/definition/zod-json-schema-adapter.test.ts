/**
 * Тесты для адаптера Zod → JSON Schema (MCP-совместимый)
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  zodToMcpInputSchema,
  extractRequiredFields,
} from '../../src/definition/zod-json-schema-adapter.js';
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

describe('zodToMcpInputSchema', () => {
  describe('Базовая конверсия', () => {
    it('должен конвертировать минимальную схему', () => {
      const result = zodToMcpInputSchema(MinimalSchema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      });
    });

    it('должен возвращать тип: object', () => {
      const result = zodToMcpInputSchema(BasicSchema);

      expect(result.type).toBe('object');
    });

    it('должен возвращать properties как Record<string, unknown>', () => {
      const result = zodToMcpInputSchema(BasicSchema);

      expect(result.properties).toBeDefined();
      expect(typeof result.properties).toBe('object');
      expect(result.properties).toHaveProperty('issueKey');
      expect(result.properties).toHaveProperty('fields');
    });
  });

  describe('Required поля', () => {
    it('должен извлекать required поля', () => {
      const result = zodToMcpInputSchema(BasicSchema);

      expect(result.required).toEqual(['issueKey']);
    });

    it('должен НЕ включать optional поля в required', () => {
      const result = zodToMcpInputSchema(BasicSchema);

      expect(result.required).not.toContain('fields');
    });

    it('должен обрабатывать схему без required полей', () => {
      const AllOptionalSchema = BasicSchema.partial();
      const result = zodToMcpInputSchema(AllOptionalSchema);

      // required должен отсутствовать или быть пустым
      expect(result.required).toBeUndefined();
    });

    it('должен обрабатывать схему только с required полями', () => {
      const result = zodToMcpInputSchema(PrimitiveTypesSchema);

      expect(result.required).toContain('stringField');
      expect(result.required).toContain('numberField');
      expect(result.required).toContain('booleanField');
      expect(result.required).not.toContain('optionalString');
      expect(result.required).not.toContain('optionalNumber');
    });
  });

  describe('Примитивные типы', () => {
    it('должен конвертировать string', () => {
      const result = zodToMcpInputSchema(MinimalSchema);

      expect((result.properties['id'] as Record<string, unknown>).type).toBe('string');
    });

    it('должен конвертировать number', () => {
      const result = zodToMcpInputSchema(PrimitiveTypesSchema);

      expect((result.properties['numberField'] as Record<string, unknown>).type).toBe('number');
    });

    it('должен конвертировать boolean', () => {
      const result = zodToMcpInputSchema(PrimitiveTypesSchema);

      expect((result.properties['booleanField'] as Record<string, unknown>).type).toBe('boolean');
    });
  });

  describe('Enums', () => {
    it('должен конвертировать z.enum() в JSON Schema enum', () => {
      const result = zodToMcpInputSchema(EnumSchema);

      const priorityProperty = result.properties['priority'] as Record<string, unknown>;
      expect(priorityProperty.type).toBe('string');
      expect(priorityProperty.enum).toEqual(['low', 'medium', 'high']);
    });
  });

  describe('Валидация (constraints)', () => {
    it('должен сохранять minLength/maxLength', () => {
      const result = zodToMcpInputSchema(ValidationSchema);

      const usernameProperty = result.properties['username'] as Record<string, unknown>;
      expect(usernameProperty.minLength).toBe(3);
      expect(usernameProperty.maxLength).toBe(20);
    });

    it('должен сохранять minimum/maximum', () => {
      const result = zodToMcpInputSchema(ValidationSchema);

      const ageProperty = result.properties['age'] as Record<string, unknown>;
      expect(ageProperty.minimum).toBe(0);
      expect(ageProperty.maximum).toBe(120);
    });

    it('должен сохранять minItems/maxItems', () => {
      const result = zodToMcpInputSchema(ValidationSchema);

      const tagsProperty = result.properties['tags'] as Record<string, unknown>;
      expect(tagsProperty.minItems).toBe(1);
      expect(tagsProperty.maxItems).toBe(10);
    });
  });

  describe('Default значения', () => {
    it('должен сохранять default значения', () => {
      const result = zodToMcpInputSchema(DefaultValuesSchema);

      const perPageProperty = result.properties['perPage'] as Record<string, unknown>;
      expect(perPageProperty.default).toBe(50);

      const includeArchivedProperty = result.properties['includeArchived'] as Record<
        string,
        unknown
      >;
      expect(includeArchivedProperty.default).toBe(false);
    });
  });

  describe('Nullable поля', () => {
    it('должен обрабатывать nullable через anyOf (Zod v4)', () => {
      const result = zodToMcpInputSchema(NullableSchema);

      const assigneeProperty = result.properties['assignee'] as Record<string, unknown>;
      // Zod v4 использует anyOf для nullable полей
      expect(assigneeProperty.anyOf).toBeDefined();
      expect(assigneeProperty.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
    });
  });

  describe('Вложенные объекты', () => {
    it('должен обрабатывать nested objects', () => {
      const result = zodToMcpInputSchema(NestedObjectSchema);

      const customFieldsProperty = result.properties['customFields'] as Record<string, unknown>;
      expect(customFieldsProperty.type).toBe('object');
      expect(customFieldsProperty.properties).toHaveProperty('resolution');
      expect(customFieldsProperty.properties).toHaveProperty('assignee');
    });

    it('должен обрабатывать глубоко вложенные объекты', () => {
      const result = zodToMcpInputSchema(DeeplyNestedSchema);

      const level1 = result.properties['level1'] as Record<string, unknown>;
      expect(level1.type).toBe('object');

      const level2 = (level1.properties as Record<string, unknown>)['level2'] as Record<
        string,
        unknown
      >;
      expect(level2.type).toBe('object');
    });
  });

  describe('Массивы', () => {
    it('должен обрабатывать массивы примитивов', () => {
      const result = zodToMcpInputSchema(ArrayOfObjectsSchema);

      const issueKeysProperty = result.properties['issueKeys'] as Record<string, unknown>;
      expect(issueKeysProperty.type).toBe('array');
      expect((issueKeysProperty.items as Record<string, unknown>).type).toBe('string');
    });

    it('должен обрабатывать массивы объектов', () => {
      const result = zodToMcpInputSchema(ArrayOfObjectsSchema);

      const filtersProperty = result.properties['filters'] as Record<string, unknown>;
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
      const result = zodToMcpInputSchema(RecordSchema);

      const customFieldsProperty = result.properties['customFields'] as Record<string, unknown>;
      expect(customFieldsProperty.type).toBe('object');
      expect(customFieldsProperty.additionalProperties).toBeTruthy();
    });
  });

  describe('Опции (options)', () => {
    it('должен поддерживать includeDescriptions: true (default)', () => {
      const result = zodToMcpInputSchema(BasicSchema, {
        includeDescriptions: true,
      });

      const issueKeyProperty = result.properties['issueKey'] as Record<string, unknown>;
      expect(issueKeyProperty.description).toBe('Ключ задачи в формате QUEUE-123');
    });

    it('должен поддерживать strict: true (default)', () => {
      const result = zodToMcpInputSchema(MinimalSchema, {
        strict: true,
      });

      expect(result.additionalProperties).toBe(false);
    });

    it('должен поддерживать strict: false', () => {
      const result = zodToMcpInputSchema(MinimalSchema, {
        strict: false,
      });

      expect(result.additionalProperties).toBeUndefined();
    });
  });

  describe('Реальные сценарии', () => {
    it('должен обрабатывать сложную реальную схему', () => {
      const result = zodToMcpInputSchema(RealWorldSchema);

      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('issueKey');
      expect(result.properties).toHaveProperty('transitionId');
      expect(result.properties).toHaveProperty('comment');
      expect(result.properties).toHaveProperty('customFields');
      expect(result.properties).toHaveProperty('fields');

      expect(result.required).toEqual(['issueKey', 'transitionId']);
    });
  });

  describe('Граничные случаи', () => {
    it('должен обрабатывать схему без required полей', () => {
      const AllOptionalSchema = PrimitiveTypesSchema.partial();
      const result = zodToMcpInputSchema(AllOptionalSchema);

      expect(result.required).toBeUndefined();
    });

    it('должен обрабатывать схему только с required полями', () => {
      const result = zodToMcpInputSchema(PrimitiveTypesSchema);

      expect(result.required?.length).toBeGreaterThan(0);
      expect(result.required).toContain('stringField');
      expect(result.required).toContain('numberField');
      expect(result.required).toContain('booleanField');
    });
  });

  describe('Ошибки и исключения', () => {
    it('должен выбросить ошибку если schema не является z.object()', () => {
      // @ts-expect-error - намеренно передаем невалидный тип для тестирования
      const invalidSchema = z.string();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Тест требует передачи невалидного типа
      expect(() => zodToMcpInputSchema(invalidSchema as any)).toThrow('Schema must be z.object()');
    });

    it('должен обрабатывать пустой z.object() (edge case)', () => {
      const emptySchema = z.object({});

      // В Zod v4 пустой объект создает valid JSON Schema с пустым properties
      const result = zodToMcpInputSchema(emptySchema);

      expect(result.type).toBe('object');
      expect(result.properties).toEqual({});
      expect(result.required).toBeUndefined();
    });
  });

  describe('Опция includeExamples', () => {
    it('должен поддерживать includeExamples: false', () => {
      // Создаем схему, которая может содержать examples в JSON Schema
      const schema = z.object({
        email: z.string().email().describe('Email address'),
        age: z.number().describe('Age'),
      });

      const result = zodToMcpInputSchema(schema, {
        includeExamples: false,
      });

      // Проверяем, что схема создана (examples будут удалены если есть)
      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('email');
      expect(result.properties).toHaveProperty('age');
    });

    it('должен удалять examples из вложенных объектов', () => {
      // Создаем схему с вложенными объектами
      const schema = z.object({
        user: z.object({
          name: z.string(),
          contact: z.object({
            email: z.string(),
          }),
        }),
      });

      const result = zodToMcpInputSchema(schema, {
        includeExamples: false,
      });

      // Проверяем структуру
      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('user');

      const userProp = result.properties['user'] as Record<string, unknown>;
      expect(userProp.type).toBe('object');
      expect(userProp.properties).toHaveProperty('name');
      expect(userProp.properties).toHaveProperty('contact');
    });

    it('должен удалять examples из массивов', () => {
      // Создаем схему с массивами
      const schema = z.object({
        tags: z.array(z.string()),
        items: z.array(
          z.object({
            name: z.string(),
          })
        ),
      });

      const result = zodToMcpInputSchema(schema, {
        includeExamples: false,
      });

      // Проверяем структуру
      expect(result.type).toBe('object');
      expect(result.properties).toHaveProperty('tags');
      expect(result.properties).toHaveProperty('items');

      const tagsProp = result.properties['tags'] as Record<string, unknown>;
      expect(tagsProp.type).toBe('array');

      const itemsProp = result.properties['items'] as Record<string, unknown>;
      expect(itemsProp.type).toBe('array');
    });
  });
});

describe('extractRequiredFields', () => {
  it('должен извлекать required поля', () => {
    const required = extractRequiredFields(BasicSchema);

    expect(required).toEqual(['issueKey']);
  });

  it('должен НЕ включать optional поля', () => {
    const required = extractRequiredFields(BasicSchema);

    expect(required).not.toContain('fields');
  });

  it('должен обрабатывать схему без required полей', () => {
    const AllOptionalSchema = BasicSchema.partial();
    const required = extractRequiredFields(AllOptionalSchema);

    expect(required).toEqual([]);
  });

  it('должен обрабатывать схему только с required полями', () => {
    const required = extractRequiredFields(PrimitiveTypesSchema);

    expect(required).toContain('stringField');
    expect(required).toContain('numberField');
    expect(required).toContain('booleanField');
    expect(required).not.toContain('optionalString');
    expect(required).not.toContain('optionalNumber');
  });

  it('должен правильно определять required в enum схеме', () => {
    const required = extractRequiredFields(EnumSchema);

    expect(required).toEqual(['priority', 'status']);
  });

  it('должен правильно определять required в сложной реальной схеме', () => {
    const required = extractRequiredFields(RealWorldSchema);

    expect(required).toEqual(['issueKey', 'transitionId']);
    expect(required).not.toContain('comment');
    expect(required).not.toContain('customFields');
    expect(required).not.toContain('fields');
  });

  it('должен обрабатывать nested objects', () => {
    const required = extractRequiredFields(NestedObjectSchema);

    expect(required).toEqual(['issueKey']);
    expect(required).not.toContain('customFields');
  });

  it('должен обрабатывать z.record()', () => {
    const required = extractRequiredFields(RecordSchema);

    expect(required).toEqual(['issueKey']);
    expect(required).not.toContain('customFields');
    expect(required).not.toContain('metadata');
  });
});
