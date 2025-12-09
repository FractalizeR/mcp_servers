/**
 * Smoke Test: Tool Search Functionality
 *
 * Проверяет функциональность поиска tools без обращения к API
 * Использует статический индекс tools
 */

import { describe, it, expect } from 'vitest';
import { ToolSearchEngine } from '@fractalizer/mcp-search';
import { WeightedCombinedStrategy } from '@fractalizer/mcp-search/strategies/weighted-combined.strategy.js';
import { NameSearchStrategy } from '@fractalizer/mcp-search/strategies/name-search.strategy.js';
import { DescriptionSearchStrategy } from '@fractalizer/mcp-search/strategies/description-search.strategy.js';
import { CategorySearchStrategy } from '@fractalizer/mcp-search/strategies/category-search.strategy.js';
import { FuzzySearchStrategy } from '@fractalizer/mcp-search/strategies/fuzzy-search.strategy.js';
import { ToolCategory } from '@fractalizer/mcp-core';
import type { StaticToolIndex } from '@fractalizer/mcp-search/types.js';
import { ToolRegistry } from '@fractalizer/mcp-core';

describe('Tool Search (Smoke)', () => {
  // Mock static index с несколькими tools
  const mockStaticIndex: StaticToolIndex[] = [
    {
      name: 'fractalizer_mcp_yandex_tracker_ping',
      category: ToolCategory.SYSTEM,
      tags: ['ping', 'health'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'ping'],
      descriptionTokens: ['api', 'health'],
      descriptionShort: 'Проверка доступности API',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_get_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'get'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'get', 'issues'],
      descriptionTokens: ['получить', 'задачи'],
      descriptionShort: 'Получить задачи по ключам',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_search_tools',
      category: ToolCategory.SEARCH,
      tags: ['search', 'tools'],
      isHelper: true,
      nameTokens: ['yandex', 'tracker', 'search', 'tools'],
      descriptionTokens: ['поиск', 'инструментов'],
      descriptionShort: 'Поиск доступных инструментов',
    },
  ];

  const mockToolRegistry = new ToolRegistry();

  it('должен найти tools по имени', () => {
    // Arrange
    const nameStrategy = new NameSearchStrategy();
    const descriptionStrategy = new DescriptionSearchStrategy();
    const categoryStrategy = new CategorySearchStrategy();
    const fuzzyStrategy = new FuzzySearchStrategy();

    const strategiesMap = new Map([
      ['name' as const, nameStrategy],
      ['description' as const, descriptionStrategy],
      ['category' as const, categoryStrategy],
      ['fuzzy' as const, fuzzyStrategy],
    ]);

    const combinedStrategy = new WeightedCombinedStrategy(strategiesMap);

    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, combinedStrategy);

    // Act
    const result = searchEngine.search({ query: 'ping' });

    // Assert
    expect(result.tools.length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.tools[0]!.name).toContain('ping');
    expect(result.totalFound).toBeGreaterThan(0);
  });

  it('должен фильтровать tools по категории', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);

    // Act
    const result = searchEngine.search({
      query: 'tracker',
      category: ToolCategory.ISSUES,
    });

    // Assert
    expect(result.tools.length).toBeGreaterThan(0);
    result.tools.forEach((tool) => {
      if ('category' in tool) {
        expect(tool.category).toBe(ToolCategory.ISSUES);
      }
    });
  });

  it('должен фильтровать helper tools', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);

    // Act
    const result = searchEngine.search({
      query: 'tracker',
      isHelper: true,
    });

    // Assert
    expect(result.tools.length).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.tools[0]!.name).toContain('search_tools');
  });

  it('должен вернуть все tools при пустом query', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);

    // Act
    const result = searchEngine.search({ query: '' });

    // Assert
    expect(result.tools.length).toBe(mockStaticIndex.length);
    expect(result.totalFound).toBe(mockStaticIndex.length);
  });

  it('должен поддерживать разные уровни детализации', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);

    // Act
    const resultNameOnly = searchEngine.search({ query: 'ping', detailLevel: 'name_only' });
    const resultWithDesc = searchEngine.search({
      query: 'ping',
      detailLevel: 'name_and_description',
    });

    // Assert
    expect(resultNameOnly.tools[0]).toHaveProperty('name');
    expect(resultNameOnly.tools[0]).not.toHaveProperty('description');

    expect(resultWithDesc.tools[0]).toHaveProperty('name');
    expect(resultWithDesc.tools[0]).toHaveProperty('description');
    expect(resultWithDesc.tools[0]).toHaveProperty('category');
  });

  it('должен кешировать результаты поиска', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);

    // Act
    searchEngine.search({ query: 'test1' });
    searchEngine.search({ query: 'test2' });
    const stats = searchEngine.getCacheStats();

    // Assert
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(100);
  });

  it('должен очищать кеш', () => {
    // Arrange
    const strategy = new NameSearchStrategy();
    const searchEngine = new ToolSearchEngine(mockStaticIndex, mockToolRegistry, strategy);
    searchEngine.search({ query: 'test' });

    // Act
    searchEngine.clearCache();
    const stats = searchEngine.getCacheStats();

    // Assert
    expect(stats.size).toBe(0);
  });
});
