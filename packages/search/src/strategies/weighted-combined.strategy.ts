/**
 * Комбинированная стратегия с весами
 *
 * Запускает все стратегии параллельно и объединяет результаты
 * с учётом весов каждой стратегии
 *
 * Алгоритм:
 * - Запуск всех стратегий
 * - Применение весов к scores
 * - Группировка по tool name
 * - Выбор максимального weighted score
 *
 * Responsibilities:
 * - Координация множественных стратегий
 * - Применение весов
 * - Агрегация и дедупликация результатов
 */

import type { ISearchStrategy } from './search-strategy.interface.js';
import type { SearchResult, StaticToolIndex, StrategyType } from '../types.js';
import { STRATEGY_WEIGHTS } from '../scoring/strategy-weights.js';

/**
 * Взвешенная комбинированная стратегия
 */
export class WeightedCombinedStrategy implements ISearchStrategy {
  constructor(private readonly strategies: Map<StrategyType, ISearchStrategy>) {}

  search(query: string, tools: StaticToolIndex[]): SearchResult[] {
    // Собираем результаты от всех стратегий
    const resultsByStrategy = new Map<StrategyType, SearchResult[]>();

    for (const [type, strategy] of this.strategies) {
      const results = strategy.search(query, tools);
      if (results.length > 0) {
        resultsByStrategy.set(type, results);
      }
    }

    // Агрегируем результаты с учётом весов
    const aggregated = this.aggregateScores(resultsByStrategy);

    // Сортируем по финальному score (descending)
    return Array.from(aggregated.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Агрегация scores с учётом весов стратегий
   *
   * Для каждого tool:
   * - Применяем вес к score каждой стратегии
   * - Берём максимальный weighted score
   * - Сохраняем детали совпадений по стратегиям
   */
  private aggregateScores(
    resultsByStrategy: Map<StrategyType, SearchResult[]>
  ): Map<string, SearchResult> {
    const aggregated = new Map<string, SearchResult>();

    for (const [strategyType, results] of resultsByStrategy) {
      const weight = STRATEGY_WEIGHTS[strategyType];

      for (const result of results) {
        const toolName = result.toolName;
        const weightedScore = result.score * weight;

        const existing = aggregated.get(toolName);

        if (!existing) {
          // Первое совпадение для этого tool
          aggregated.set(toolName, {
            toolName,
            score: weightedScore,
            ...(result.matchReason && { matchReason: result.matchReason }),
            strategyType,
            matchDetails: {
              [strategyType]: result.score,
            },
          });
        } else {
          // Tool уже найден другой стратегией
          // Берём максимальный weighted score
          if (weightedScore > existing.score) {
            existing.score = weightedScore;
            if (result.matchReason) {
              existing.matchReason = result.matchReason;
            }
            existing.strategyType = strategyType;
          }

          // Добавляем детали совпадения
          if (!existing.matchDetails) {
            existing.matchDetails = {};
          }
          existing.matchDetails[strategyType] = result.score;
        }
      }
    }

    return aggregated;
  }
}
