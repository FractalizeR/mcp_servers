/**
 * Smoke тесты для автогенерации MCP Definition из Zod Schema
 *
 * Проверяет, что все инструменты в проекте:
 * 1. Успешно генерируют definition
 * 2. Definition имеет валидную структуру
 * 3. Definition соответствует Zod schema (если доступен)
 *
 * Эти тесты НЕ проверяют бизнес-логику инструментов,
 * а только корректность генерации definition.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { validateGeneratedDefinition } from '#helpers/schema-definition-matcher.js';

describe('Definition Generation - Smoke Tests', () => {
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;

  beforeAll(() => {
    // Создаем минимальные моки для конструкторов
    mockFacade = {} as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;
  });

  describe('Все инструменты должны генерировать валидный definition', () => {
    // Проверяем каждый инструмент отдельно
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} должен генерировать валидный definition`, () => {
        // Создаем экземпляр инструмента
        const tool = new ToolClass(mockFacade, mockLogger);

        // Получаем definition
        const definition = tool.getDefinition();

        // Проверяем наличие обязательных полей
        expect(definition).toBeDefined();
        expect(definition.name).toBeDefined();
        expect(typeof definition.name).toBe('string');
        expect(definition.name.length).toBeGreaterThan(0);

        expect(definition.description).toBeDefined();
        expect(typeof definition.description).toBe('string');
        expect(definition.description.length).toBeGreaterThan(0);

        expect(definition.inputSchema).toBeDefined();

        // Проверяем структуру inputSchema
        validateGeneratedDefinition(definition.inputSchema);
      });
    });
  });

  describe('Definition должен иметь корректную структуру properties', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} properties должны быть объектами`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        // Каждое property должно быть объектом с type
        if (definition.inputSchema.properties) {
          Object.entries(definition.inputSchema.properties).forEach(([_propName, propSchema]) => {
            expect(propSchema).toBeDefined();
            expect(typeof propSchema).toBe('object');
            // JSON Schema требует наличия type или anyOf/oneOf/allOf
            const hasType = 'type' in propSchema;
            const hasComposition =
              'anyOf' in propSchema || 'oneOf' in propSchema || 'allOf' in propSchema;
            expect(hasType || hasComposition).toBe(true);
          });
        }
      });
    });
  });

  describe('Required поля должны существовать в properties', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} required поля должны быть в properties`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        if (definition.inputSchema.required && definition.inputSchema.required.length > 0) {
          expect(definition.inputSchema.properties).toBeDefined();

          definition.inputSchema.required.forEach((requiredField) => {
            expect(definition.inputSchema.properties).toHaveProperty(requiredField);
          });
        }
      });
    });
  });

  describe('Tool names должны соответствовать конвенциям', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} должен иметь корректное имя`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        // Имя должно быть непустым
        expect(definition.name).toBeDefined();
        expect(definition.name.length).toBeGreaterThan(0);

        // Имя должно быть в lowercase с допустимыми символами (буквы, цифры, _, -)
        expect(definition.name).toMatch(/^[a-z0-9_-]+$/);
      });
    });
  });

  describe('Descriptions должны быть информативными', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name} должен иметь информативное описание`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        // Описание должно быть достаточно длинным
        expect(definition.description.length).toBeGreaterThan(10);

        // Описание не должно быть просто названием класса
        const className = ToolClass.name.toLowerCase();
        expect(definition.description.toLowerCase()).not.toBe(className);
      });
    });
  });

  describe('Статистика по всем инструментам', () => {
    it('должна показать общее количество инструментов', () => {
      const totalTools = TOOL_CLASSES.length;
      expect(totalTools).toBeGreaterThan(0);

      console.log(`\n📊 Всего инструментов: ${totalTools}`);
    });

    it('должна показать статистику по required полям', () => {
      const stats = TOOL_CLASSES.map((ToolClass) => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();

        return {
          name: ToolClass.name,
          requiredCount: definition.inputSchema.required?.length || 0,
          propertiesCount: Object.keys(definition.inputSchema.properties || {}).length,
        };
      });

      const totalRequired = stats.reduce((sum, s) => sum + s.requiredCount, 0);
      const totalProperties = stats.reduce((sum, s) => sum + s.propertiesCount, 0);

      console.log(`\n📊 Статистика по полям:`);
      console.log(`   - Всего properties: ${totalProperties}`);
      console.log(`   - Всего required: ${totalRequired}`);
      console.log(
        `   - Среднее required на инструмент: ${(totalRequired / TOOL_CLASSES.length).toFixed(1)}`
      );
      console.log(
        `   - Среднее properties на инструмент: ${(totalProperties / TOOL_CLASSES.length).toFixed(1)}`
      );

      expect(stats).toBeDefined();
    });

    it('должна показать инструменты без обязательных полей', () => {
      const noRequiredTools = TOOL_CLASSES.filter((ToolClass) => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const definition = tool.getDefinition();
        return !definition.inputSchema.required || definition.inputSchema.required.length === 0;
      });

      console.log(`\n📊 Инструменты без обязательных полей (${noRequiredTools.length}):`);
      noRequiredTools.forEach((ToolClass) => {
        console.log(`   - ${ToolClass.name}`);
      });

      expect(noRequiredTools).toBeDefined();
    });
  });

  describe('Интеграция с getParamsSchema() (опционально)', () => {
    it('инструменты с getParamsSchema() должны возвращать Zod schema', () => {
      const toolsWithSchema = TOOL_CLASSES.filter((ToolClass) => {
        const tool = new ToolClass(mockFacade, mockLogger);
        return 'getParamsSchema' in tool && typeof tool.getParamsSchema === 'function';
      });

      // Проверяем только инструменты, у которых есть метод
      toolsWithSchema.forEach((ToolClass) => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const schema = (tool as { getParamsSchema: () => unknown }).getParamsSchema();

        // Zod schema должен иметь метод _def
        expect(schema).toBeDefined();
        expect(schema).toHaveProperty('_def');
      });

      // Информация для отладки
      console.log(
        `\n📊 Инструменты с getParamsSchema(): ${toolsWithSchema.length}/${TOOL_CLASSES.length}`
      );
    });
  });
});
