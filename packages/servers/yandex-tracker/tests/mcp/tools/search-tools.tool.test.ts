/**
 * E2E тесты для SearchToolsTool
 *
 * Тестовые сценарии:
 * - Полный цикл execute() с реальными зависимостями (mock)
 * - Валидация параметров через Zod
 * - Успешные поисковые запросы с разными параметрами
 * - Три уровня детализации (name_only, name_and_description, full)
 * - Фильтрация по категории и типу
 * - Обработка ошибок
 * - Формирование JSON ответа
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchToolsTool } from '@mcp-framework/search';
import { ToolSearchEngine } from '@mcp-framework/search/engine';
import {
  WeightedCombinedStrategy,
  NameSearchStrategy,
  DescriptionSearchStrategy,
  CategorySearchStrategy,
  FuzzySearchStrategy,
} from '@mcp-framework/search/strategies';
import { ToolCategory, buildToolName } from '@mcp-framework/core';
import type { StaticToolIndex, StrategyType } from '@mcp-framework/search/types.js';
import type { ToolRegistry } from '@mcp-framework/core/tool-registry.js';
import type { BaseTool } from '@mcp-framework/core/tools/base/base-tool.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { MCP_TOOL_PREFIX } from '@constants';

describe('SearchToolsTool (E2E)', () => {
  // Mock ToolRegistry
  class MockToolRegistry {
    private tools = new Map<string, BaseTool>();

    register(name: string, tool: BaseTool): void {
      this.tools.set(name, tool);
    }

    getTool(name: string): BaseTool | undefined {
      return this.tools.get(name);
    }
  }

  // Mock BaseTool
  class MockTool {
    constructor(
      private name: string,
      private description: string,
      private inputSchema: Record<string, unknown>
    ) {}

    getMetadata() {
      return {
        definition: {
          name: this.name,
          description: this.description,
          inputSchema: this.inputSchema,
        },
        category: ToolCategory.ISSUES,
        tags: ['mock', 'test'],
        isHelper: false,
        examples: ['example usage'],
      };
    }
  }

  // Mock Logger
  const mockLogger = {
    info: () => {},
    error: () => {},
    debug: () => {},
    child: () => mockLogger,
  } as unknown as Logger;

  const mockIndex: StaticToolIndex[] = [
    {
      name: buildToolName('ping', MCP_TOOL_PREFIX),
      category: ToolCategory.USERS,
      tags: ['ping', 'health', 'check'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'ping'],
      descriptionTokens: ['api', 'oauth'],
      descriptionShort: 'Проверка доступности API',
    },
    {
      name: buildToolName('get_issues', MCP_TOOL_PREFIX),
      category: ToolCategory.ISSUES,
      tags: ['issue', 'get', 'batch'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'get', 'issues'],
      descriptionTokens: ['batch'],
      descriptionShort: 'Получить задачи по ключам',
    },
    {
      name: buildToolName('find_issues', MCP_TOOL_PREFIX),
      category: ToolCategory.ISSUES,
      tags: ['issue', 'find', 'search', 'jql'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'find', 'issues'],
      descriptionTokens: ['jql'],
      descriptionShort: 'Найти задачи по JQL запросу',
    },
    {
      name: buildToolName('search_tools', MCP_TOOL_PREFIX),
      category: ToolCategory.SEARCH,
      tags: ['search', 'tools', 'discovery'],
      isHelper: true,
      nameTokens: ['yandex', 'tracker', 'search', 'tools'],
      descriptionTokens: ['mcp'],
      descriptionShort: 'Поиск доступных MCP инструментов',
    },
  ];

  let toolRegistry: MockToolRegistry;
  let searchEngine: ToolSearchEngine;
  let tool: SearchToolsTool;

  beforeEach(() => {
    // Создаём fresh instances для каждого теста
    toolRegistry = new MockToolRegistry();

    // Регистрируем mock tools
    mockIndex.forEach((indexEntry) => {
      const mockTool = new MockTool(indexEntry.name, indexEntry.descriptionShort, {
        type: 'object',
        properties: {},
      });
      toolRegistry.register(indexEntry.name, mockTool as unknown as BaseTool);
    });

    // Создаём стратегии
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Допустимо для Map со стратегиями поиска (type inference)
    const strategies = new Map<StrategyType, any>([
      ['name', new NameSearchStrategy()],
      ['description', new DescriptionSearchStrategy()],
      ['category', new CategorySearchStrategy()],
      ['fuzzy', new FuzzySearchStrategy(3)],
    ]);

    const combinedStrategy = new WeightedCombinedStrategy(strategies);

    searchEngine = new ToolSearchEngine(
      mockIndex,
      toolRegistry as unknown as ToolRegistry,
      combinedStrategy
    );

    tool = new SearchToolsTool(searchEngine, mockLogger);
  });

  describe('Успешные поисковые запросы', () => {
    it('должен найти tools по простому query', async () => {
      const result = await tool.execute({ query: 'ping' });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);

      const content = result.content[0]!;
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.success).toBe(true);
        expect(parsed.data.query).toBe('ping');
        expect(parsed.data.totalFound).toBeGreaterThan(0);
        expect(parsed.data.returned).toBeGreaterThan(0);
        expect(parsed.data.tools).toBeInstanceOf(Array);
        expect(parsed.data.tools[0].name).toBe(buildToolName('ping', MCP_TOOL_PREFIX));
      }
    });

    it('должен применить лимит к результатам', async () => {
      const result = await tool.execute({ query: 'yandex', limit: 2 });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.returned).toBeLessThanOrEqual(2);
        expect(parsed.data.tools.length).toBeLessThanOrEqual(2);
        expect(parsed.data.totalFound).toBeGreaterThanOrEqual(parsed.data.returned);
      }
    });

    it('должен использовать default limit (10)', async () => {
      const result = await tool.execute({ query: 'yandex' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Уровни детализации', () => {
    it('name_only: должен вернуть только имена', async () => {
      const result = await tool.execute({ query: 'ping', detailLevel: 'name_only' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          expect(toolData.name).toBeDefined();
          expect(toolData.description).toBeUndefined();
          expect(toolData.category).toBeUndefined();
          expect(toolData.inputSchema).toBeUndefined();
        });
      }
    });

    it('name_and_description: должен вернуть имя, описание, категорию', async () => {
      const result = await tool.execute({
        query: 'ping',
        detailLevel: 'name_and_description',
      });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          expect(toolData.name).toBeDefined();
          expect(toolData.description).toBeDefined();
          expect(toolData.category).toBeDefined();
          expect(toolData.score).toBeGreaterThanOrEqual(0);
          expect(toolData.inputSchema).toBeUndefined(); // Не загружено
        });
      }
    });

    it('full: должен загрузить полные метаданные', async () => {
      const result = await tool.execute({ query: 'ping', detailLevel: 'full' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          expect(toolData.name).toBeDefined();
          expect(toolData.description).toBeDefined();
          expect(toolData.category).toBeDefined();
          expect(toolData.tags).toBeDefined();
          expect(toolData.inputSchema).toBeDefined(); // Загружено
          expect(toolData.examples).toBeDefined();
        });
      }
    });

    it('default detailLevel = name_and_description', async () => {
      const result = await tool.execute({ query: 'ping' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools[0].description).toBeDefined();
        expect(parsed.data.tools[0].category).toBeDefined();
        expect(parsed.data.tools[0].inputSchema).toBeUndefined();
      }
    });
  });

  describe('Фильтрация', () => {
    it('должен фильтровать по категории', async () => {
      const result = await tool.execute({ query: 'yandex', category: ToolCategory.ISSUES });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          const indexEntry = mockIndex.find((t) => t.name === toolData.name);
          expect(indexEntry?.category).toBe(ToolCategory.ISSUES);
        });
      }
    });

    it('должен фильтровать по типу (helper)', async () => {
      const result = await tool.execute({ query: 'yandex', isHelper: true });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          const indexEntry = mockIndex.find((t) => t.name === toolData.name);
          expect(indexEntry?.isHelper).toBe(true);
        });
      }
    });

    it('должен фильтровать по типу (API)', async () => {
      const result = await tool.execute({ query: 'yandex', isHelper: false });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          const indexEntry = mockIndex.find((t) => t.name === toolData.name);
          expect(indexEntry?.isHelper).toBe(false);
        });
      }
    });

    it('должен комбинировать фильтры', async () => {
      const result = await tool.execute({
        query: 'yandex',
        category: ToolCategory.ISSUES,
        isHelper: false,
        limit: 5,
      });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамическая структура данных из JSON
        parsed.data.tools.forEach((toolData: any) => {
          const indexEntry = mockIndex.find((t) => t.name === toolData.name);
          expect(indexEntry?.category).toBe(ToolCategory.ISSUES);
          expect(indexEntry?.isHelper).toBe(false);
        });
      }
    });
  });

  describe('Валидация параметров', () => {
    it('должен вернуть ошибку для пустого query', async () => {
      const result = await tool.execute({ query: '' });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const content = result.content[0]!;
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        expect(content.text).toContain('Query must be a non-empty string');
      }
    });

    it('должен вернуть ошибку для невалидного detailLevel', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Намеренно невалидное значение для теста валидации ошибок
      const result = await tool.execute({ query: 'ping', detailLevel: 'invalid' as any });

      expect(result.isError).toBe(true);
      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Invalid option');
      }
    });

    it('должен вернуть ошибку для невалидной категории', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Намеренно невалидное значение для теста валидации ошибок
      const result = await tool.execute({ query: 'ping', category: 'INVALID_CATEGORY' as any });

      expect(result.isError).toBe(true);
      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Invalid option');
      }
    });

    it('должен вернуть ошибку для невалидного limit (негативное число)', async () => {
      const result = await tool.execute({ query: 'ping', limit: -5 });

      expect(result.isError).toBe(true);
      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Too small');
      }
    });

    it('должен вернуть ошибку для невалидного limit (не целое число)', async () => {
      const result = await tool.execute({ query: 'ping', limit: 3.14 });

      expect(result.isError).toBe(true);
      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Invalid input');
      }
    });

    it('должен принять валидные параметры', async () => {
      const result = await tool.execute({
        query: 'ping',
        detailLevel: 'full',
        category: ToolCategory.USERS,
        isHelper: false,
        limit: 10,
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('должен обработать query без совпадений', async () => {
      const result = await tool.execute({ query: 'nonexistent_completely_unique' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.totalFound).toBe(0);
        expect(parsed.data.returned).toBe(0);
        expect(parsed.data.tools).toHaveLength(0);
      }
    });

    it('должен обработать очень длинный query', async () => {
      const longQuery = 'a'.repeat(1000);
      const result = await tool.execute({ query: longQuery });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools).toBeInstanceOf(Array);
      }
    });

    it('должен обработать специальные символы в query', async () => {
      const result = await tool.execute({ query: 'tracker_' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools).toBeInstanceOf(Array);
      }
    });

    it('должен обработать query с пробелами', async () => {
      const result = await tool.execute({ query: '  ping  ' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.query).toBe('ping'); // Trimmed
        expect(parsed.data.tools.length).toBeGreaterThan(0);
      }
    });
  });

  describe('JSON формат ответа', () => {
    it('должен вернуть валидный JSON', async () => {
      const result = await tool.execute({ query: 'ping' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(() => JSON.parse(content.text)).not.toThrow();
      }
    });

    it('должен включить все обязательные поля в ответ', async () => {
      const result = await tool.execute({ query: 'ping' });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed).toHaveProperty('success');
        expect(parsed).toHaveProperty('data');
        expect(parsed.data).toHaveProperty('query');
        expect(parsed.data).toHaveProperty('totalFound');
        expect(parsed.data).toHaveProperty('returned');
        expect(parsed.data).toHaveProperty('tools');
        expect(typeof parsed.data.query).toBe('string');
        expect(typeof parsed.data.totalFound).toBe('number');
        expect(typeof parsed.data.returned).toBe('number');
        expect(Array.isArray(parsed.data.tools)).toBe(true);
      }
    });

    it('totalFound должен быть >= returned', async () => {
      const result = await tool.execute({ query: 'yandex', limit: 1 });

      expect(result.isError).toBe(false);
      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.totalFound).toBeGreaterThanOrEqual(parsed.data.returned);
      }
    });
  });

  describe('METADATA', () => {
    it('должен содержать корректные статические метаданные', () => {
      expect(SearchToolsTool.METADATA).toBeDefined();
      // SearchToolsTool - framework tool, БЕЗ префикса проекта
      expect(SearchToolsTool.METADATA.name).toBe(buildToolName('search_tools'));
      expect(SearchToolsTool.METADATA.category).toBe(ToolCategory.SEARCH);
      expect(SearchToolsTool.METADATA.isHelper).toBe(true);
      expect(SearchToolsTool.METADATA.tags).toContain('search');
      expect(SearchToolsTool.METADATA.tags).toContain('tools');
      expect(SearchToolsTool.METADATA.tags).toContain('discovery');
    });

    it('description должно быть информативным', () => {
      expect(SearchToolsTool.METADATA.description.length).toBeGreaterThan(50);
      expect(SearchToolsTool.METADATA.description).toContain('MCP');
    });

    it('examples должны быть определены', () => {
      expect(SearchToolsTool.METADATA.examples).toBeDefined();
      expect(SearchToolsTool.METADATA.examples!.length).toBeGreaterThan(0);
    });
  });
});
