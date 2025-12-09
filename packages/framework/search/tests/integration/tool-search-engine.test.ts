/**
 * Integration тесты для ToolSearchEngine
 *
 * Тестовые сценарии:
 * - Интеграция всех стратегий через WeightedCombinedStrategy
 * - Кеширование результатов поиска
 * - Фильтрация по категориям и типам
 * - Lazy loading метаданных (3 уровня детализации)
 * - Работа с реальным ToolRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSearchEngine } from '@fractalizer/mcp-search/tool-search-engine.js';
import { WeightedCombinedStrategy } from '@fractalizer/mcp-search/strategies/weighted-combined.strategy.js';
import { NameSearchStrategy } from '@fractalizer/mcp-search/strategies/name-search.strategy.js';
import { DescriptionSearchStrategy } from '@fractalizer/mcp-search/strategies/description-search.strategy.js';
import { CategorySearchStrategy } from '@fractalizer/mcp-search/strategies/category-search.strategy.js';
import { FuzzySearchStrategy } from '@fractalizer/mcp-search/strategies/fuzzy-search.strategy.js';
import { ToolCategory } from '@fractalizer/mcp-core/tools/base/tool-metadata.js';
import type { StaticToolIndex, StrategyType } from '@fractalizer/mcp-search/types.js';
import type { ToolRegistry } from '@fractalizer/mcp-core/tool-registry.js';
import type { BaseTool } from '@fractalizer/mcp-core/tools/base/base-tool.js';

describe('ToolSearchEngine (Integration)', () => {
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
        category: ToolCategory.DEMO,
        tags: ['mock'],
        isHelper: true,
        examples: ['example usage'],
      };
    }
  }

  const mockIndex: StaticToolIndex[] = [
    {
      name: 'fractalizer_mcp_yandex_tracker_ping',
      category: ToolCategory.USERS,
      tags: ['ping', 'health', 'check'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'ping'],
      descriptionTokens: ['api', 'oauth'],
      descriptionShort: 'Проверка доступности API',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_get_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'get', 'batch'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'get', 'issues'],
      descriptionTokens: ['batch'],
      descriptionShort: 'Получить задачи по ключам',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_find_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'find', 'search', 'jql'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'find', 'issues'],
      descriptionTokens: ['jql'],
      descriptionShort: 'Найти задачи по JQL запросу',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_search_tools',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Map со стратегиями поиска (type inference)
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
  });

  describe('Поиск с несколькими стратегиями', () => {
    it('должен находить tools по разным стратегиям и объединять результаты', () => {
      const results = searchEngine.search({
        query: 'ping',
        limit: 10,
      });

      expect(results.totalFound).toBeGreaterThan(0);
      expect(results.tools.length).toBeGreaterThan(0);

      // 'ping' должен найтись по нескольким стратегиям
      const pingTool = results.tools.find((t) => t.name === 'fractalizer_mcp_yandex_tracker_ping');
      expect(pingTool).toBeDefined();
    });

    it('должен сортировать результаты по weighted score', () => {
      const results = searchEngine.search({
        query: 'issues',
        limit: 10,
      });

      // Результаты должны быть отсортированы по убыванию score
      for (let i = 0; i < results.tools.length - 1; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Доступ к опциональному полю score для проверки сортировки
        const currentScore = (results.tools[i] as any).score ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Доступ к опциональному полю score для проверки сортировки
        const nextScore = (results.tools[i + 1] as any).score ?? 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('должен объединять scores от разных стратегий', () => {
      // 'search' найдётся и по name, и по category, и по tags
      const results = searchEngine.search({
        query: 'search',
        limit: 10,
      });

      const searchTool = results.tools.find(
        (t) => t.name === 'fractalizer_mcp_yandex_tracker_search_tools'
      );
      expect(searchTool).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Доступ к опциональному полю score для проверки
      expect((searchTool as any)?.score).toBeGreaterThan(0);
    });
  });

  describe('Фильтрация', () => {
    it('должен фильтровать по категории', () => {
      const results = searchEngine.search({
        query: 'yandex',
        category: ToolCategory.ISSUES,
        limit: 10,
      });

      results.tools.forEach((tool) => {
        const indexEntry = mockIndex.find((t) => t.name === tool.name);
        expect(indexEntry?.category).toBe(ToolCategory.ISSUES);
      });
    });

    it('name_and_description: должен вернуть имя, описание, категорию, score', () => {
      const results = searchEngine.search({
        query: 'ping',
        detailLevel: 'name_and_description',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамические данные результатов поиска
      results.tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.category).toBeDefined();
        expect(tool.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('full: должен загрузить полные метаданные из ToolRegistry', () => {
      const results = searchEngine.search({
        query: 'ping',
        detailLevel: 'full',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамические данные результатов поиска
      results.tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.category).toBeDefined();
        expect(tool.tags).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.examples).toBeDefined();
        expect(tool.score).toBeDefined();
      });
    });
  });

  describe('Кеширование', () => {
    it('должен кешировать результаты идентичных запросов', () => {
      const params = {
        query: 'ping',
        limit: 5,
        detailLevel: 'name_and_description' as const,
      };

      const results1 = searchEngine.search(params);
      const results2 = searchEngine.search(params);

      // Результаты должны быть идентичны
      expect(results1.totalFound).toBe(results2.totalFound);
      expect(results1.tools.length).toBe(results2.tools.length);
      expect(results1.tools[0]?.name).toBe(results2.tools[0]?.name);
    });

    it('должен использовать разные cache keys для разных query', () => {
      const results1 = searchEngine.search({ query: 'ping' });
      const results2 = searchEngine.search({ query: 'issues' });

      expect(results1.tools[0]?.name).not.toBe(results2.tools[0]?.name);
    });

    it('должен использовать разные cache keys для разных detailLevel', () => {
      const results1 = searchEngine.search({
        query: 'ping',
        detailLevel: 'name_only',
      });

      const results2 = searchEngine.search({
        query: 'ping',
        detailLevel: 'full',
      });

      // name_only не имеет description, full имеет
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Доступ к опциональному полю description для проверки
      expect((results1.tools[0] as any)?.description).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Доступ к опциональному полю description для проверки
      expect((results2.tools[0] as any)?.description).toBeDefined();
    });

    it('должен очищать кеш при вызове clearCache()', () => {
      const params = { query: 'ping' };

      searchEngine.search(params);
      const stats1 = searchEngine.getCacheStats();
      expect(stats1.size).toBeGreaterThan(0);

      searchEngine.clearCache();
      const stats2 = searchEngine.getCacheStats();
      expect(stats2.size).toBe(0);
    });

    it('должен ограничивать размер кеша (LRU)', () => {
      // Заполняем кеш больше MAX_CACHE_SIZE
      for (let i = 0; i < 150; i++) {
        searchEngine.search({ query: `query${i}` });
      }

      const stats = searchEngine.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Edge cases', () => {
    it('должен обрабатывать пустой query', () => {
      // Пустой query возвращает все доступные инструменты
      const results = searchEngine.search({ query: '' });

      // Должны вернуться все зарегистрированные инструменты
      expect(results.totalFound).toBeGreaterThan(0);
      expect(results.tools.length).toBe(results.totalFound);
    });

    it('должен обрабатывать query без совпадений', () => {
      const results = searchEngine.search({ query: 'nonexistent_completely_unique' });

      expect(results.totalFound).toBe(0);
      expect(results.tools.length).toBe(0);
    });

    it('должен обрабатывать очень длинный query', () => {
      const longQuery = 'a'.repeat(1000);
      const results = searchEngine.search({ query: longQuery });

      expect(Array.isArray(results.tools)).toBe(true);
      expect(results.totalFound).toBeGreaterThanOrEqual(0);
    });

    it('должен обрабатывать специальные символы в query', () => {
      const results = searchEngine.search({ query: 'tracker_' });

      expect(results.totalFound).toBeGreaterThan(0);
    });

    it('должен обрабатывать пустой индекс', () => {
      const emptyEngine = new ToolSearchEngine(
        [],
        toolRegistry as unknown as ToolRegistry,
        new WeightedCombinedStrategy(new Map([['name', new NameSearchStrategy()]]))
      );

      const results = emptyEngine.search({ query: 'anything' });

      expect(results.totalFound).toBe(0);
      expect(results.tools.length).toBe(0);
    });
  });
});
