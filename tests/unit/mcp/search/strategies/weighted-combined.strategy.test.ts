/**
 * Unit тесты для WeightedCombinedStrategy
 *
 * Тестовые сценарии:
 * - Комбинирование результатов из нескольких стратегий
 * - Применение весов к scores
 * - Дедупликация по tool name (максимальный weighted score)
 * - Сохранение matchDetails для каждой стратегии
 * - Правильная сортировка по weighted score
 */

import { describe, it, expect } from 'vitest';
import { WeightedCombinedStrategy } from '@mcp/search/strategies/weighted-combined.strategy.js';
import type { ISearchStrategy } from '@mcp/search/strategies/search-strategy.interface.js';
import type { SearchResult, StaticToolIndex, StrategyType } from '@mcp/search/types.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';

// Mock стратегии для тестирования
class MockStrategy implements ISearchStrategy {
  constructor(private readonly results: SearchResult[]) {}

  search(_query: string, _tools: StaticToolIndex[]): SearchResult[] {
    return this.results;
  }
}

describe('WeightedCombinedStrategy', () => {
  const mockTools: StaticToolIndex[] = [
    {
      name: 'tool_a',
      category: ToolCategory.ISSUES,
      tags: ['test'],
      isHelper: false,
      nameTokens: ['tool', 'a'],
      descriptionTokens: ['test', 'tool'],
      descriptionShort: 'Test tool A',
    },
    {
      name: 'tool_b',
      category: ToolCategory.ISSUES,
      tags: ['test'],
      isHelper: false,
      nameTokens: ['tool', 'b'],
      descriptionTokens: ['another', 'tool'],
      descriptionShort: 'Test tool B',
    },
  ];

  it('должна вернуть пустой массив когда все стратегии вернули пустые результаты', () => {
    // Arrange
    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy([])],
      ['description' as StrategyType, new MockStrategy([])],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toEqual([]);
  });

  it('должна применить веса к scores от разных стратегий', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'name' as StrategyType },
    ];
    const descResults: SearchResult[] = [
      { toolName: 'tool_b', score: 0.8, strategyType: 'description' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy(descResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(2);
    // name strategy имеет вес 1.0, description - 0.5
    // tool_a: 1.0 * 1.0 = 1.0
    // tool_b: 0.8 * 0.5 = 0.4
    expect(results[0]!.toolName).toBe('tool_a');
    expect(results[0]!.score).toBeCloseTo(1.0, 2);
    expect(results[1]!.toolName).toBe('tool_b');
    expect(results[1]!.score).toBeCloseTo(0.4, 2);
  });

  it('должна выбрать максимальный weighted score для дубликатов', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.5, strategyType: 'name' as StrategyType },
    ];
    const descResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'description' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy(descResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.toolName).toBe('tool_a');
    // description weight = 0.5, name weight = 1.0
    // name: 0.5 * 1.0 = 0.5
    // description: 1.0 * 0.5 = 0.5 (равны, остается первый - name)
    expect(results[0]!.score).toBeCloseTo(0.5, 2);
    expect(results[0]!.strategyType).toBe('name');
  });

  it('должна сохранять matchDetails для каждой стратегии', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.8, strategyType: 'name' as StrategyType },
    ];
    const descResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.6, strategyType: 'description' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy(descResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.matchDetails).toBeDefined();
    expect(results[0]!.matchDetails?.name).toBe(0.8);
    expect(results[0]!.matchDetails?.description).toBe(0.6);
  });

  it('должна сохранять matchReason из стратегии с максимальным weighted score', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      {
        toolName: 'tool_a',
        score: 0.5,
        strategyType: 'name' as StrategyType,
        matchReason: 'Name contains query',
      },
    ];
    const descResults: SearchResult[] = [
      {
        toolName: 'tool_a',
        score: 1.0,
        strategyType: 'description' as StrategyType,
        matchReason: 'Description matches exactly',
      },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy(descResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    // Weighted scores равны (0.5 * 1.0 = 0.5 === 1.0 * 0.5 = 0.5)
    // Остается matchReason от первой стратегии (name)
    expect(results[0]!.matchReason).toBe('Name contains query');
  });

  it('должна правильно сортировать результаты по weighted score (descending)', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.6, strategyType: 'name' as StrategyType },
      { toolName: 'tool_b', score: 1.0, strategyType: 'name' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(2);
    expect(results[0]!.toolName).toBe('tool_b'); // 1.0 * 1.0 = 1.0
    expect(results[0]!.score).toBeCloseTo(1.0, 2);
    expect(results[1]!.toolName).toBe('tool_a'); // 0.6 * 1.0 = 0.6
    expect(results[1]!.score).toBeCloseTo(0.6, 2);
  });

  it('должна обрабатывать случай когда только одна стратегия вернула результаты', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.9, strategyType: 'name' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy([])],
      ['category' as StrategyType, new MockStrategy([])],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.toolName).toBe('tool_a');
    expect(results[0]!.score).toBeCloseTo(0.9, 2);
    expect(results[0]!.matchDetails?.name).toBe(0.9);
  });

  it('должна обрабатывать результаты без matchReason', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'name' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.matchReason).toBeUndefined();
  });

  it('должна корректно объединять результаты из 3+ стратегий', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.8, strategyType: 'name' as StrategyType },
    ];
    const descResults: SearchResult[] = [
      { toolName: 'tool_a', score: 0.6, strategyType: 'description' as StrategyType },
      { toolName: 'tool_b', score: 0.9, strategyType: 'description' as StrategyType },
    ];
    const categoryResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'category' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)],
      ['description' as StrategyType, new MockStrategy(descResults)],
      ['category' as StrategyType, new MockStrategy(categoryResults)],
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(2);
    // tool_a имеет 3 совпадения в matchDetails
    const toolA = results.find((r) => r.toolName === 'tool_a');
    expect(toolA?.matchDetails).toBeDefined();
    expect(Object.keys(toolA?.matchDetails ?? {})).toHaveLength(3);
    expect(toolA?.matchDetails?.name).toBe(0.8);
    expect(toolA?.matchDetails?.description).toBe(0.6);
    expect(toolA?.matchDetails?.category).toBe(1.0);
  });

  it('должна обновлять strategyType при нахождении большего weighted score', () => {
    // Arrange
    const nameResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'name' as StrategyType },
    ];
    const categoryResults: SearchResult[] = [
      { toolName: 'tool_a', score: 1.0, strategyType: 'category' as StrategyType },
    ];

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name' as StrategyType, new MockStrategy(nameResults)], // вес 1.0
      ['category' as StrategyType, new MockStrategy(categoryResults)], // вес 0.9
    ]);
    const strategy = new WeightedCombinedStrategy(strategies);

    // Act
    const results = strategy.search('query', mockTools);

    // Assert
    expect(results).toHaveLength(1);
    // name имеет больший weighted score (1.0 * 1.0 = 1.0 > 1.0 * 0.9 = 0.9)
    expect(results[0]!.strategyType).toBe('name');
  });
});
