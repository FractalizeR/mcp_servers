/**
 * Unit тесты для ToolSearchEngine
 *
 * Тестовые сценарии:
 * - Поиск с кешированием
 * - Фильтрация по категориям и типам
 * - Форматирование результатов по уровню детализации
 * - LRU cache eviction
 * - Очистка кеша
 * - Генерация ключей кеша
 * - Lazy loading метаданных
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolSearchEngine } from '@mcp/search/tool-search-engine.js';
import type { ISearchStrategy } from '@mcp/search/strategies/search-strategy.interface.js';
import type {
  SearchParams,
  SearchResult,
  StaticToolIndex,
  StrategyType,
} from '@mcp/search/types.js';
import type { ToolRegistry } from '@mcp/tool-registry.js';
import type { BaseTool } from '@mcp/tools/base/base-tool.js';
import type { ToolMetadata } from '@mcp/tools/base/tool-metadata.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';

// Mock стратегии
class MockSearchStrategy implements ISearchStrategy {
  constructor(private readonly results: SearchResult[]) {}

  search(_query: string, tools: StaticToolIndex[]): SearchResult[] {
    // Возвращаем только результаты для tools которые присутствуют в переданном списке
    const toolNames = new Set(tools.map((t) => t.name));
    return this.results.filter((r) => toolNames.has(r.toolName));
  }
}

describe('ToolSearchEngine', () => {
  const mockStaticIndex: StaticToolIndex[] = [
    {
      name: 'get_issues',
      category: ToolCategory.ISSUES,
      tags: ['api', 'read'],
      isHelper: false,
      nameTokens: ['get', 'issues'],
      descriptionTokens: ['получить', 'задачи'],
      descriptionShort: 'Получить задачи',
    },
    {
      name: 'search_tools',
      category: ToolCategory.SEARCH,
      tags: ['search', 'helper'],
      isHelper: true,
      nameTokens: ['search', 'tools'],
      descriptionTokens: ['поиск', 'инструментов'],
      descriptionShort: 'Поиск инструментов',
    },
    {
      name: 'create_issue',
      category: ToolCategory.ISSUES,
      tags: ['api', 'write'],
      isHelper: false,
      nameTokens: ['create', 'issue'],
      descriptionTokens: ['создать', 'задачу'],
      descriptionShort: 'Создать задачу',
    },
  ];

  let mockToolRegistry: ToolRegistry;
  let searchEngine: ToolSearchEngine;
  let mockStrategy: MockSearchStrategy;

  beforeEach(() => {
    // Mock ToolRegistry
    mockToolRegistry = {
      getTool: vi.fn((name: string): BaseTool | undefined => {
        if (name === 'get_issues') {
          return {
            getMetadata: (): ToolMetadata => ({
              definition: {
                name: 'get_issues',
                description: 'Получить задачи из Яндекс.Трекера',
                inputSchema: { type: 'object', properties: {} },
              },
              examples: ['example1'],
            }),
          } as BaseTool;
        }
        return undefined;
      }),
    } as unknown as ToolRegistry;

    // Mock стратегия с результатами
    mockStrategy = new MockSearchStrategy([
      {
        toolName: 'get_issues',
        score: 1.0,
        strategyType: 'name' as StrategyType,
      },
      {
        toolName: 'search_tools',
        score: 0.8,
        strategyType: 'description' as StrategyType,
        matchDetails: {
          strategy: 'description',
          field: 'description',
          matchedTokens: ['поиск'],
        },
      },
    ]);

    searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, mockStrategy);
  });

  describe('search()', () => {
    it('должен выполнить поиск и вернуть результаты', () => {
      // Act
      const result = searchEngine.search({ query: 'issues' });

      // Assert
      expect(result.totalFound).toBe(2);
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('get_issues');
      expect(result.tools[1].name).toBe('search_tools');
    });

    it('должен использовать кеш при повторном поиске с теми же параметрами', () => {
      // Arrange
      const searchSpy = vi.spyOn(mockStrategy, 'search');

      // Act
      const result1 = searchEngine.search({ query: 'issues' });
      const result2 = searchEngine.search({ query: 'issues' });

      // Assert
      expect(result1).toBe(result2); // Точно тот же объект
      expect(searchSpy).toHaveBeenCalledTimes(1); // Стратегия вызвана только один раз
    });

    it('должен выполнить новый поиск при изменении параметров', () => {
      // Arrange
      const searchSpy = vi.spyOn(mockStrategy, 'search');

      // Act
      searchEngine.search({ query: 'issues' });
      searchEngine.search({ query: 'tasks' }); // Другой query

      // Assert
      expect(searchSpy).toHaveBeenCalledTimes(2);
    });

    it('должен применить LRU eviction при превышении размера кеша', () => {
      // Arrange - создаем 101 уникальный запрос
      for (let i = 0; i <= 100; i++) {
        searchEngine.search({ query: `query${i}` });
      }

      // Act
      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(100); // Размер не превышает MAX_CACHE_SIZE
      expect(stats.maxSize).toBe(100);
    });

    it('должен применить limit к результатам', () => {
      // Act
      const result = searchEngine.search({ query: 'issues', limit: 1 });

      // Assert
      expect(result.totalFound).toBe(2); // Всего найдено 2
      expect(result.tools).toHaveLength(1); // Но вернули только 1
    });

    it('должен использовать DEFAULT_TOOL_SEARCH_LIMIT если limit не указан', () => {
      // Arrange - создаем расширенный индекс с 100 tools
      const largeIndex: StaticToolIndex[] = [];
      const manyResults: SearchResult[] = [];
      for (let i = 0; i < 100; i++) {
        largeIndex.push({
          name: `tool_${i}`,
          category: ToolCategory.ISSUES,
          tags: ['test'],
          isHelper: false,
          nameTokens: ['tool', String(i)],
          descriptionTokens: ['test'],
          descriptionShort: `Tool ${i}`,
        });
        manyResults.push({
          toolName: `tool_${i}`,
          score: 1.0 - i * 0.01,
          strategyType: 'name' as StrategyType,
        });
      }
      const strategyWithMany = new MockSearchStrategy(manyResults);
      const engineWithMany = new ToolSearchEngine(largeIndex, mockToolRegistry, strategyWithMany);

      // Act
      const result = engineWithMany.search({ query: 'test' });

      // Assert
      expect(result.totalFound).toBe(100);
      expect(result.tools.length).toBeLessThanOrEqual(10); // DEFAULT_TOOL_SEARCH_LIMIT = 10
    });
  });

  describe('filterStaticIndex()', () => {
    it('должен фильтровать по категории', () => {
      // Arrange - создаем стратегию которая возвращает все 3 tools
      const strategyAll = new MockSearchStrategy([
        { toolName: 'get_issues', score: 1.0, strategyType: 'name' as StrategyType },
        { toolName: 'search_tools', score: 0.9, strategyType: 'name' as StrategyType },
        { toolName: 'create_issue', score: 0.8, strategyType: 'name' as StrategyType },
      ]);
      const engineAll = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategyAll);

      // Act - фильтруем только SEARCH
      const result = engineAll.search({
        query: 'test',
        category: ToolCategory.SEARCH,
        detailLevel: 'name_and_description',
      });

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].category).toBe(ToolCategory.SEARCH);
    });

    it('должен фильтровать по isHelper = true', () => {
      // Act
      const result = searchEngine.search({ query: 'test', isHelper: true });

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('search_tools');
    });

    it('должен фильтровать по isHelper = false', () => {
      // Arrange
      const mockStrategyAll = new MockSearchStrategy([
        { toolName: 'get_issues', score: 1.0, strategyType: 'name' as StrategyType },
        { toolName: 'create_issue', score: 0.9, strategyType: 'name' as StrategyType },
      ]);
      const engineAll = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, mockStrategyAll);

      // Act
      const result = engineAll.search({ query: 'test', isHelper: false });

      // Assert
      expect(result.tools).toHaveLength(2);
      expect(result.tools.every((t) => t.name !== 'search_tools')).toBe(true);
    });

    it('должен применить несколько фильтров одновременно', () => {
      // Act
      const result = searchEngine.search({
        query: 'test',
        category: ToolCategory.ISSUES,
        isHelper: false,
        detailLevel: 'name_and_description', // Чтобы category был в результате
      });

      // Assert - должен вернуть только API tools из категории ISSUES
      result.tools.forEach((tool) => {
        expect(tool.category).toBe(ToolCategory.ISSUES);
      });
    });
  });

  describe('formatResults()', () => {
    it('должен вернуть только name при detailLevel = name_only', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'name_only' });

      // Assert
      expect(result.tools[0]).toEqual({ name: 'get_issues' });
      expect(result.tools[0]).not.toHaveProperty('description');
      expect(result.tools[0]).not.toHaveProperty('category');
    });

    it('должен вернуть name, description, category, score при detailLevel = name_and_description', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'name_and_description' });

      // Assert
      expect(result.tools[0]).toHaveProperty('name', 'get_issues');
      expect(result.tools[0]).toHaveProperty('description', 'Получить задачи');
      expect(result.tools[0]).toHaveProperty('category', ToolCategory.ISSUES);
      expect(result.tools[0]).toHaveProperty('score', 1.0);
    });

    it('должен использовать name_and_description по умолчанию', () => {
      // Act
      const result = searchEngine.search({ query: 'test' });

      // Assert
      expect(result.tools[0]).toHaveProperty('description');
      expect(result.tools[0]).toHaveProperty('category');
    });

    it('должен вернуть полные метаданные при detailLevel = full', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'full' });

      // Assert
      const firstTool = result.tools[0];
      expect(firstTool).toHaveProperty('name', 'get_issues');
      expect(firstTool).toHaveProperty('description', 'Получить задачи из Яндекс.Трекера');
      expect(firstTool).toHaveProperty('category', ToolCategory.ISSUES);
      expect(firstTool).toHaveProperty('tags', ['api', 'read']);
      expect(firstTool).toHaveProperty('inputSchema', { type: 'object', properties: {} });
      expect(firstTool).toHaveProperty('examples', ['example1']);
      expect(firstTool).toHaveProperty('score', 1.0);
    });

    it('должен включить matchDetails при detailLevel = full и они есть', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'full' });

      // Assert
      const searchToolResult = result.tools.find((t) => t.name === 'search_tools');
      expect(searchToolResult).toHaveProperty('matchDetails', {
        strategy: 'description',
        field: 'description',
        matchedTokens: ['поиск'],
      });
    });

    it('должен использовать descriptionShort если tool не найден в registry', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'full' });

      // Assert
      const searchToolResult = result.tools.find((t) => t.name === 'search_tools');
      expect(searchToolResult?.description).toBe('Поиск инструментов'); // descriptionShort
    });

    it('должен округлить score до 2 знаков после запятой', () => {
      // Arrange
      const strategyWithFloat = new MockSearchStrategy([
        { toolName: 'get_issues', score: 0.876543, strategyType: 'name' as StrategyType },
      ]);
      const engineFloat = new ToolSearchEngine(
        mockStaticIndex,
        mockToolRegistry,
        strategyWithFloat
      );

      // Act
      const result = engineFloat.search({ query: 'test', detailLevel: 'name_and_description' });

      // Assert
      expect(result.tools[0].score).toBe(0.88);
    });

    it('должен обработать случай когда staticData не найден', () => {
      // Arrange - создаем индекс с unknown_tool
      const indexWithUnknown: StaticToolIndex[] = [
        {
          name: 'unknown_tool',
          category: ToolCategory.ISSUES,
          tags: [],
          isHelper: false,
          nameTokens: ['unknown'],
          descriptionTokens: [],
          descriptionShort: 'Unknown',
        },
      ];
      const strategyWithUnknown = new MockSearchStrategy([
        { toolName: 'unknown_tool', score: 1.0, strategyType: 'name' as StrategyType },
      ]);
      const engineUnknown = new ToolSearchEngine(
        indexWithUnknown,
        mockToolRegistry,
        strategyWithUnknown
      );

      // Act - используем name_only чтобы получить только name
      const result = engineUnknown.search({ query: 'test', detailLevel: 'name_only' });

      // Assert - tool не найден в registry, поэтому должен быть только name
      expect(result.tools[0]).toEqual({ name: 'unknown_tool' });
    });
  });

  describe('getCacheKey()', () => {
    it('должен генерировать одинаковый ключ для одинаковых параметров', () => {
      // Act
      searchEngine.search({ query: 'Test Query', limit: 5 });
      const stats1 = searchEngine.getCacheStats();

      searchEngine.search({ query: 'test query', limit: 5 }); // Другой регистр
      const stats2 = searchEngine.getCacheStats();

      // Assert - должен использовать кеш
      expect(stats2.size).toBe(stats1.size);
    });

    it('должен генерировать разные ключи для разных параметров', () => {
      // Act
      searchEngine.search({ query: 'test', limit: 5 });
      searchEngine.search({ query: 'test', limit: 10 }); // Другой limit

      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(2); // Два разных ключа
    });

    it('должен учитывать category в ключе кеша', () => {
      // Act
      searchEngine.search({ query: 'test', category: ToolCategory.ISSUES });
      searchEngine.search({ query: 'test', category: ToolCategory.HELPERS });

      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(2);
    });

    it('должен учитывать isHelper в ключе кеша', () => {
      // Act
      searchEngine.search({ query: 'test', isHelper: true });
      searchEngine.search({ query: 'test', isHelper: false });

      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(2);
    });

    it('должен учитывать detailLevel в ключе кеша', () => {
      // Act
      searchEngine.search({ query: 'test', detailLevel: 'name_only' });
      searchEngine.search({ query: 'test', detailLevel: 'full' });

      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(2);
    });
  });

  describe('clearCache()', () => {
    it('должен очистить весь кеш', () => {
      // Arrange
      searchEngine.search({ query: 'test1' });
      searchEngine.search({ query: 'test2' });
      expect(searchEngine.getCacheStats().size).toBe(2);

      // Act
      searchEngine.clearCache();

      // Assert
      expect(searchEngine.getCacheStats().size).toBe(0);
    });

    it('должен позволить кешировать новые результаты после очистки', () => {
      // Arrange
      searchEngine.search({ query: 'test' });
      searchEngine.clearCache();

      // Act
      searchEngine.search({ query: 'new' });

      // Assert
      expect(searchEngine.getCacheStats().size).toBe(1);
    });
  });

  describe('getCacheStats()', () => {
    it('должен вернуть корректную статистику пустого кеша', () => {
      // Act
      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
    });

    it('должен вернуть корректную статистику заполненного кеша', () => {
      // Arrange
      for (let i = 0; i < 5; i++) {
        searchEngine.search({ query: `query${i}` });
      }

      // Act
      const stats = searchEngine.getCacheStats();

      // Assert
      expect(stats.size).toBe(5);
      expect(stats.maxSize).toBe(100);
    });
  });
});
