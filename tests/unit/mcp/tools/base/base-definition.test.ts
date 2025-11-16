import { describe, it, expect } from 'vitest';
import { BaseToolDefinition } from '@mcp/tools/base/base-definition.js';
import type { ToolDefinition } from '@mcp/tools/base/base-definition.js';
import type { StaticToolMetadata } from '@mcp/tools/base/tool-metadata.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';

// Тестовая реализация BaseToolDefinition (безопасная)
class TestToolDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return {
      name: 'test_tool',
      description: 'Test tool description',
      category: ToolCategory.DEMO,
      tags: ['test'],
      isHelper: true,
      requiresExplicitUserConsent: false,
    };
  }

  build(): ToolDefinition {
    return {
      name: 'test_tool',
      description: 'Test tool description',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  // Публичный метод для тестирования wrapWithSafetyWarning
  public testWrapWithSafetyWarning(description: string): string {
    return this.wrapWithSafetyWarning(description);
  }

  // Публичные методы для тестирования protected методов
  public testBuildStringParam(
    description: string,
    options?: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      examples?: string[];
    }
  ) {
    return this.buildStringParam(description, options);
  }

  public testBuildNumberParam(
    description: string,
    options?: {
      minimum?: number;
      maximum?: number;
      examples?: number[];
    }
  ) {
    return this.buildNumberParam(description, options);
  }

  public testBuildArrayParam(
    description: string,
    itemSchema: Record<string, unknown>,
    options?: {
      minItems?: number;
      maxItems?: number;
      examples?: unknown[];
    }
  ) {
    return this.buildArrayParam(description, itemSchema, options);
  }

  public testBuildEnumParam<T extends string>(
    description: string,
    values: T[],
    options?: {
      examples?: T[];
    }
  ) {
    return this.buildEnumParam(description, values, options);
  }

  public testBuildBooleanParam(description: string) {
    return this.buildBooleanParam(description);
  }
}

// Тестовая реализация с requiresExplicitUserConsent: true
class DangerousToolDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return {
      name: 'dangerous_tool',
      description: 'Dangerous tool that modifies data',
      category: ToolCategory.ISSUES,
      tags: ['write', 'dangerous'],
      isHelper: false,
      requiresExplicitUserConsent: true,
    };
  }

  build(): ToolDefinition {
    return {
      name: 'dangerous_tool',
      description: this.wrapWithSafetyWarning('Dangerous tool that modifies data'),
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  // Публичный метод для тестирования wrapWithSafetyWarning
  public testWrapWithSafetyWarning(description: string): string {
    return this.wrapWithSafetyWarning(description);
  }
}

describe('BaseToolDefinition', () => {
  let definition: TestToolDefinition;

  beforeEach(() => {
    definition = new TestToolDefinition();
  });

  describe('buildStringParam', () => {
    it('должна создать базовую схему строкового параметра', () => {
      // Act
      const schema = definition.testBuildStringParam('Test string parameter');

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Test string parameter',
      });
    });

    it('должна добавить pattern к схеме', () => {
      // Act
      const schema = definition.testBuildStringParam('Email parameter', {
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      });

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Email parameter',
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      });
    });

    it('должна добавить minLength и maxLength', () => {
      // Act
      const schema = definition.testBuildStringParam('Username parameter', {
        minLength: 3,
        maxLength: 20,
      });

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Username parameter',
        minLength: 3,
        maxLength: 20,
      });
    });

    it('должна добавить примеры', () => {
      // Act
      const schema = definition.testBuildStringParam('Status parameter', {
        examples: ['active', 'inactive'],
      });

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Status parameter',
        examples: ['active', 'inactive'],
      });
    });

    it('должна добавить все опции одновременно', () => {
      // Act
      const schema = definition.testBuildStringParam('Complex parameter', {
        pattern: '^[A-Z]+-\\d+$',
        minLength: 5,
        maxLength: 15,
        examples: ['TEST-123', 'PROJ-456'],
      });

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Complex parameter',
        pattern: '^[A-Z]+-\\d+$',
        minLength: 5,
        maxLength: 15,
        examples: ['TEST-123', 'PROJ-456'],
      });
    });
  });

  describe('buildNumberParam', () => {
    it('должна создать базовую схему числового параметра', () => {
      // Act
      const schema = definition.testBuildNumberParam('Test number parameter');

      // Assert
      expect(schema).toEqual({
        type: 'number',
        description: 'Test number parameter',
      });
    });

    it('должна добавить minimum и maximum', () => {
      // Act
      const schema = definition.testBuildNumberParam('Age parameter', {
        minimum: 0,
        maximum: 120,
      });

      // Assert
      expect(schema).toEqual({
        type: 'number',
        description: 'Age parameter',
        minimum: 0,
        maximum: 120,
      });
    });

    it('должна добавить примеры', () => {
      // Act
      const schema = definition.testBuildNumberParam('Count parameter', {
        examples: [10, 20, 30],
      });

      // Assert
      expect(schema).toEqual({
        type: 'number',
        description: 'Count parameter',
        examples: [10, 20, 30],
      });
    });

    it('должна добавить все опции одновременно', () => {
      // Act
      const schema = definition.testBuildNumberParam('Rating parameter', {
        minimum: 1,
        maximum: 5,
        examples: [3, 4, 5],
      });

      // Assert
      expect(schema).toEqual({
        type: 'number',
        description: 'Rating parameter',
        minimum: 1,
        maximum: 5,
        examples: [3, 4, 5],
      });
    });
  });

  describe('buildArrayParam', () => {
    it('должна создать базовую схему массива', () => {
      // Arrange
      const itemSchema = { type: 'string' };

      // Act
      const schema = definition.testBuildArrayParam('Test array parameter', itemSchema);

      // Assert
      expect(schema).toEqual({
        type: 'array',
        description: 'Test array parameter',
        items: { type: 'string' },
      });
    });

    it('должна добавить minItems и maxItems', () => {
      // Arrange
      const itemSchema = { type: 'number' };

      // Act
      const schema = definition.testBuildArrayParam('Numbers array', itemSchema, {
        minItems: 1,
        maxItems: 10,
      });

      // Assert
      expect(schema).toEqual({
        type: 'array',
        description: 'Numbers array',
        items: { type: 'number' },
        minItems: 1,
        maxItems: 10,
      });
    });

    it('должна добавить примеры', () => {
      // Arrange
      const itemSchema = { type: 'string' };

      // Act
      const schema = definition.testBuildArrayParam('Tags array', itemSchema, {
        examples: [['tag1', 'tag2'], ['tag3']],
      });

      // Assert
      expect(schema).toEqual({
        type: 'array',
        description: 'Tags array',
        items: { type: 'string' },
        examples: [['tag1', 'tag2'], ['tag3']],
      });
    });

    it('должна работать с сложной схемой элементов', () => {
      // Arrange
      const itemSchema = {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
      };

      // Act
      const schema = definition.testBuildArrayParam('Objects array', itemSchema, {
        minItems: 0,
        maxItems: 100,
      });

      // Assert
      expect(schema).toEqual({
        type: 'array',
        description: 'Objects array',
        items: itemSchema,
        minItems: 0,
        maxItems: 100,
      });
    });
  });

  describe('buildEnumParam', () => {
    it('должна создать базовую схему enum параметра', () => {
      // Act
      const schema = definition.testBuildEnumParam('Status parameter', ['active', 'inactive']);

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Status parameter',
        enum: ['active', 'inactive'],
      });
    });

    it('должна добавить примеры', () => {
      // Act
      const schema = definition.testBuildEnumParam(
        'Priority parameter',
        ['low', 'medium', 'high', 'critical'],
        {
          examples: ['medium', 'high'],
        }
      );

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Priority parameter',
        enum: ['low', 'medium', 'high', 'critical'],
        examples: ['medium', 'high'],
      });
    });

    it('должна работать с одним значением enum', () => {
      // Act
      const schema = definition.testBuildEnumParam('Single value', ['only']);

      // Assert
      expect(schema).toEqual({
        type: 'string',
        description: 'Single value',
        enum: ['only'],
      });
    });
  });

  describe('buildBooleanParam', () => {
    it('должна создать схему булевого параметра', () => {
      // Act
      const schema = definition.testBuildBooleanParam('Is active parameter');

      // Assert
      expect(schema).toEqual({
        type: 'boolean',
        description: 'Is active parameter',
      });
    });
  });

  describe('build', () => {
    it('должна вернуть корректное определение инструмента', () => {
      // Act
      const toolDef = definition.build();

      // Assert
      expect(toolDef.name).toBe('test_tool');
      expect(toolDef.description).toBe('Test tool description');
      expect(toolDef.inputSchema.type).toBe('object');
      expect(toolDef.inputSchema.properties).toEqual({});
      expect(toolDef.inputSchema.required).toEqual([]);
    });
  });

  describe('wrapWithSafetyWarning', () => {
    it('НЕ должна добавлять предупреждение когда requiresExplicitUserConsent = false', () => {
      // Arrange
      const safeDefinition = new TestToolDefinition();
      const originalDescription = 'This is a safe read-only operation';

      // Act
      const wrappedDescription = safeDefinition.testWrapWithSafetyWarning(originalDescription);

      // Assert
      expect(wrappedDescription).toBe(originalDescription);
      expect(wrappedDescription).not.toContain('⚠️');
      expect(wrappedDescription).not.toContain('КРИТИЧЕСКИ ВАЖНО');
    });

    it('ДОЛЖНА добавлять предупреждение когда requiresExplicitUserConsent = true', () => {
      // Arrange
      const dangerousDefinition = new DangerousToolDefinition();
      const originalDescription = 'This operation modifies user data';

      // Act
      const wrappedDescription = dangerousDefinition.testWrapWithSafetyWarning(originalDescription);

      // Assert
      expect(wrappedDescription).toContain(originalDescription);
      expect(wrappedDescription).toContain('⚠️');
      expect(wrappedDescription).toContain('КРИТИЧЕСКИ ВАЖНО');
      expect(wrappedDescription).toContain('ИЗМЕНЯЕТ данные пользователя');
      expect(wrappedDescription.length).toBeGreaterThan(originalDescription.length);
    });

    it('должна сохранить оригинальное описание в начале', () => {
      // Arrange
      const dangerousDefinition = new DangerousToolDefinition();
      const originalDescription = 'Updates issue status in Yandex.Tracker';

      // Act
      const wrappedDescription = dangerousDefinition.testWrapWithSafetyWarning(originalDescription);

      // Assert
      expect(wrappedDescription.startsWith(originalDescription)).toBe(true);
    });

    it('должна содержать ключевые фразы предупреждения', () => {
      // Arrange
      const dangerousDefinition = new DangerousToolDefinition();
      const originalDescription = 'Deletes an issue';

      // Act
      const wrappedDescription = dangerousDefinition.testWrapWithSafetyWarning(originalDescription);

      // Assert
      expect(wrappedDescription).toContain('Используй его ТОЛЬКО если');
      expect(wrappedDescription).toContain('Пользователь ЯВНО попросил');
      expect(wrappedDescription).toContain('НИКОГДА не используй этот инструмент');
      expect(wrappedDescription).toContain('не используй placeholder/dummy значения');
    });

    it('должна работать для пустого описания', () => {
      // Arrange
      const dangerousDefinition = new DangerousToolDefinition();
      const originalDescription = '';

      // Act
      const wrappedDescription = dangerousDefinition.testWrapWithSafetyWarning(originalDescription);

      // Assert
      expect(wrappedDescription).toContain('⚠️');
      expect(wrappedDescription).toContain('КРИТИЧЕСКИ ВАЖНО');
    });

    it('build() должен использовать wrapWithSafetyWarning для опасных операций', () => {
      // Arrange
      const dangerousDefinition = new DangerousToolDefinition();

      // Act
      const toolDef = dangerousDefinition.build();

      // Assert
      expect(toolDef.description).toContain('Dangerous tool that modifies data');
      expect(toolDef.description).toContain('⚠️');
      expect(toolDef.description).toContain('КРИТИЧЕСКИ ВАЖНО');
    });

    it('build() НЕ должен добавлять предупреждение для безопасных операций', () => {
      // Arrange
      const safeDefinition = new TestToolDefinition();

      // Act
      const toolDef = safeDefinition.build();

      // Assert
      expect(toolDef.description).toBe('Test tool description');
      expect(toolDef.description).not.toContain('⚠️');
      expect(toolDef.description).not.toContain('КРИТИЧЕСКИ ВАЖНО');
    });
  });
});
