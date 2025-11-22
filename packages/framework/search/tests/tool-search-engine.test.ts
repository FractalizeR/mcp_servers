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
import { ToolSearchEngine } from '../src/engine/tool-search-engine.js';
import type { ISearchStrategy } from '../src/strategies/search-strategy.interface.js';
import type { SearchResult, StaticToolIndex, StrategyType } from '../src/types.js';
import type { BaseTool } from '../../core/src/tools/base/base-tool.js';
import type { ToolMetadata } from '../../core/src/tools/base/tool-metadata.js';
import { ToolCategory } from '../../core/src/tools/base/tool-metadata.js';

// Mock ToolRegistry interface (для тестов, чтобы не зависеть от yandex-tracker)
interface ToolRegistry {
  getTool(name: string): BaseTool | undefined;
}

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
              category: ToolCategory.ISSUES,
              tags: ['api', 'read'],
              isHelper: false,
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
          description: 0.8,
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
      expect(result.tools[0]!.name).toBe('get_issues');
      expect(result.tools[1]!.name).toBe('search_tools');
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
      expect((result.tools[0] as { category: ToolCategory })!.category).toBe(ToolCategory.SEARCH);
    });

    it('должен фильтровать по isHelper = true', () => {
      // Act
      const result = searchEngine.search({ query: 'test', isHelper: true });

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0]!.name).toBe('search_tools');
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
        expect((tool as { category: ToolCategory }).category).toBe(ToolCategory.ISSUES);
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
        description: 0.8,
      });
    });

    it('должен использовать descriptionShort если tool не найден в registry', () => {
      // Act
      const result = searchEngine.search({ query: 'test', detailLevel: 'full' });

      // Assert
      const searchToolResult = result.tools.find((t) => t.name === 'search_tools');
      expect((searchToolResult as { description?: string })?.description).toBe(
        'Поиск инструментов'
      ); // descriptionShort
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
      expect((result.tools[0] as { score?: number })!.score).toBe(0.88);
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
      searchEngine.search({ query: 'test', category: ToolCategory.SEARCH });

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

  describe('Динамический индекс (без staticIndex)', () => {
    it('должен построить индекс из ToolRegistry когда staticIndex === null', () => {
      // Arrange
      const mockTools: BaseTool[] = [
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'dynamic_tool_1',
              description: 'First dynamic tool for testing',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
            tags: ['dynamic', 'test'],
            isHelper: false,
          }),
        } as BaseTool,
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'dynamic_tool_2',
              description: 'Second dynamic tool! With special-chars_test',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.SEARCH,
            tags: ['helper'],
            isHelper: true,
          }),
        } as BaseTool,
      ];

      const dynamicRegistry = {
        getAllTools: vi.fn(() => mockTools),
        getTool: vi.fn((name: string) =>
          mockTools.find((t) => t.getMetadata().definition.name === name)
        ),
      } as unknown as ToolRegistry;

      const strategyForDynamic = new MockSearchStrategy([
        { toolName: 'dynamic_tool_1', score: 1.0, strategyType: 'name' as StrategyType },
        { toolName: 'dynamic_tool_2', score: 0.9, strategyType: 'name' as StrategyType },
      ]);

      // Act - создаем engine без staticIndex
      const dynamicEngine = new ToolSearchEngine(null, dynamicRegistry, strategyForDynamic);
      const result = dynamicEngine.search({ query: 'dynamic' });

      // Assert
      expect(dynamicRegistry.getAllTools).toHaveBeenCalled();
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0]!.name).toBe('dynamic_tool_1');
    });

    it('должен использовать lazy loading для динамического индекса', () => {
      // Arrange
      const mockTools: BaseTool[] = [
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'lazy_tool',
              description: 'Lazy loaded tool',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
            isHelper: false,
          }),
        } as BaseTool,
      ];

      const lazyRegistry = {
        getAllTools: vi.fn(() => mockTools),
        getTool: vi.fn(),
      } as unknown as ToolRegistry;

      const lazyStrategy = new MockSearchStrategy([
        { toolName: 'lazy_tool', score: 1.0, strategyType: 'name' as StrategyType },
      ]);

      const lazyEngine = new ToolSearchEngine(null, lazyRegistry, lazyStrategy);

      // Act - первый поиск должен построить индекс
      lazyEngine.search({ query: 'test1' });
      const firstCallCount = (lazyRegistry.getAllTools as ReturnType<typeof vi.fn>).mock.calls
        .length;

      // Второй поиск должен использовать кеш индекса
      lazyEngine.search({ query: 'test2' });
      const secondCallCount = (lazyRegistry.getAllTools as ReturnType<typeof vi.fn>).mock.calls
        .length;

      // Assert - getAllTools должен быть вызван только один раз
      expect(firstCallCount).toBe(1);
      expect(secondCallCount).toBe(1); // Не увеличился
    });

    it('должен пропустить tools без обязательных полей при построении индекса', () => {
      // Arrange
      const incompleteTools: BaseTool[] = [
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: '', // Пустое имя
              description: 'Tool without name',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
          }),
        } as BaseTool,
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'valid_tool',
              description: '', // Пустое описание
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
          }),
        } as BaseTool,
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'tool_without_category',
              description: 'Valid description',
              inputSchema: { type: 'object', properties: {} },
            },
            // Нет category
          }),
        } as BaseTool,
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'complete_tool',
              description: 'Complete tool',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
          }),
        } as BaseTool,
      ];

      const incompleteRegistry = {
        getAllTools: vi.fn(() => incompleteTools),
        getTool: vi.fn(),
      } as unknown as ToolRegistry;

      const incompleteStrategy = new MockSearchStrategy([
        { toolName: 'complete_tool', score: 1.0, strategyType: 'name' as StrategyType },
      ]);

      // Act
      const incompleteEngine = new ToolSearchEngine(null, incompleteRegistry, incompleteStrategy);
      const result = incompleteEngine.search({ query: 'test' });

      // Assert - только complete_tool должен быть в результатах
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0]!.name).toBe('complete_tool');
    });

    it('должен корректно токенизировать имена с underscores и dashes', () => {
      // Arrange
      const toolsWithSpecialChars: BaseTool[] = [
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'get_user-info_test',
              description: 'Test tokenization with special-chars_and_underscores',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
          }),
        } as BaseTool,
      ];

      const specialRegistry = {
        getAllTools: vi.fn(() => toolsWithSpecialChars),
        getTool: vi.fn(),
      } as unknown as ToolRegistry;

      const specialStrategy = new MockSearchStrategy([
        { toolName: 'get_user-info_test', score: 1.0, strategyType: 'name' as StrategyType },
      ]);

      // Act
      const specialEngine = new ToolSearchEngine(null, specialRegistry, specialStrategy);
      const result = specialEngine.search({ query: 'user' });

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0]!.name).toBe('get_user-info_test');
    });

    it('должен извлекать краткое описание из первого предложения', () => {
      // Arrange
      const toolsWithLongDesc: BaseTool[] = [
        {
          getMetadata: (): ToolMetadata => ({
            definition: {
              name: 'tool_with_long_description',
              description: 'First sentence here. Second sentence should be ignored! Third one too?',
              inputSchema: { type: 'object', properties: {} },
            },
            category: ToolCategory.ISSUES,
          }),
        } as BaseTool,
      ];

      const longDescRegistry = {
        getAllTools: vi.fn(() => toolsWithLongDesc),
        getTool: vi.fn(),
      } as unknown as ToolRegistry;

      const longDescStrategy = new MockSearchStrategy([
        {
          toolName: 'tool_with_long_description',
          score: 1.0,
          strategyType: 'name' as StrategyType,
        },
      ]);

      // Act
      const longDescEngine = new ToolSearchEngine(null, longDescRegistry, longDescStrategy);
      const result = longDescEngine.search({ query: 'test', detailLevel: 'name_and_description' });

      // Assert
      const tool = result.tools[0] as { description?: string };
      expect(tool.description).toBe('First sentence here');
    });
  });

  describe('Поиск с пустым query', () => {
    it('должен вернуть все отфильтрованные tools когда query пустой', () => {
      // Arrange - используем стратегию которая ничего не вернет, чтобы проверить что используется fallback
      const emptyStrategy = new MockSearchStrategy([]);
      const emptyEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, emptyStrategy);

      // Act
      const result = emptyEngine.search({ query: '' });

      // Assert
      expect(result.tools).toHaveLength(3); // Все 3 tools из mockStaticIndex
      expect(result.totalFound).toBe(3);
    });

    it('должен вернуть все отфильтрованные tools когда query = "*"', () => {
      // Arrange
      const wildCardStrategy = new MockSearchStrategy([]);
      const wildCardEngine = new ToolSearchEngine(
        mockStaticIndex,
        mockToolRegistry,
        wildCardStrategy
      );

      // Act
      const result = wildCardEngine.search({ query: '*' });

      // Assert
      expect(result.tools).toHaveLength(3);
      expect(result.totalFound).toBe(3);
    });

    it('должен вернуть все tools с score = 1.0 для пустого query', () => {
      // Arrange
      const allStrategy = new MockSearchStrategy([]);
      const allEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, allStrategy);

      // Act
      const result = allEngine.search({ query: '', detailLevel: 'name_and_description' });

      // Assert
      result.tools.forEach((tool) => {
        expect((tool as { score?: number }).score).toBe(1.0);
      });
    });

    it('должен применять фильтры даже с пустым query', () => {
      // Arrange
      const filterStrategy = new MockSearchStrategy([]);
      const filterEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, filterStrategy);

      // Act
      const result = filterEngine.search({
        query: '',
        category: ToolCategory.ISSUES,
        detailLevel: 'name_and_description',
      });

      // Assert
      expect(result.tools).toHaveLength(2); // Только ISSUES tools
      expect(
        result.tools.every(
          (t) => (t as { category?: ToolCategory }).category === ToolCategory.ISSUES
        )
      ).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('должен обработать query со специальными символами', () => {
      // Arrange
      const specialCharsStrategy = new MockSearchStrategy([
        { toolName: 'get_issues', score: 1.0, strategyType: 'name' as StrategyType },
      ]);
      const specialEngine = new ToolSearchEngine(
        mockStaticIndex,
        mockToolRegistry,
        specialCharsStrategy
      );

      // Act
      const result = specialEngine.search({ query: 'test@#$%^&*()' });

      // Assert - должен работать без ошибок
      expect(result.tools).toHaveLength(1);
    });

    it('должен обработать очень длинный query', () => {
      // Arrange
      const longQuery = 'a'.repeat(1000);
      const longQueryStrategy = new MockSearchStrategy([]);
      const longQueryEngine = new ToolSearchEngine(
        mockStaticIndex,
        mockToolRegistry,
        longQueryStrategy
      );

      // Act
      const result = longQueryEngine.search({ query: longQuery });

      // Assert - должен работать без ошибок
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
    });

    it('должен использовать DEFAULT_LIMIT когда limit = 0 (falsy)', () => {
      // Arrange
      const zeroLimitStrategy = new MockSearchStrategy([
        { toolName: 'get_issues', score: 1.0, strategyType: 'name' as StrategyType },
      ]);
      const zeroLimitEngine = new ToolSearchEngine(
        mockStaticIndex,
        mockToolRegistry,
        zeroLimitStrategy
      );

      // Act
      const result = zeroLimitEngine.search({ query: 'test', limit: 0 });

      // Assert - limit = 0 воспринимается как falsy и заменяется на DEFAULT_LIMIT
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.totalFound).toBe(1);
    });
  });
});
