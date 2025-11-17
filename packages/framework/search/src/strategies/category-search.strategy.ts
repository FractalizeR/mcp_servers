/**
 * Стратегия поиска по категориям и тегам
 *
 * Алгоритм:
 * - Точное совпадение категории: score = 1.0
 * - Совпадение тега: score = 0.9
 * - Частичное совпадение тега: score = 0.7
 *
 * Responsibilities:
 * - Поиск по категориям
 * - Поиск по тегам
 * - Оценка релевантности совпадения
 */

import type { ISearchStrategy } from './search-strategy.interface.js';
import type { SearchResult, StaticToolIndex } from '../types.js';

/**
 * Стратегия поиска по категориям и тегам
 */
export class CategorySearchStrategy implements ISearchStrategy {
  search(query: string, tools: StaticToolIndex[]): SearchResult[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const tool of tools) {
      // Проверка категории
      const categoryScore = this.scoreCategoryMatch(tool.category, lowerQuery);
      if (categoryScore > 0) {
        results.push({
          toolName: tool.name,
          score: categoryScore,
          matchReason: `Category match: ${tool.category}`,
          strategyType: 'category',
        });
        continue; // Если нашли в категории, не проверяем теги
      }

      // Проверка тегов
      const tagMatch = this.findTagMatch(tool.tags, lowerQuery);
      if (tagMatch) {
        results.push({
          toolName: tool.name,
          score: tagMatch.score,
          matchReason: `Tag match: ${tagMatch.tag}`,
          strategyType: 'tags',
        });
      }
    }

    return results;
  }

  /**
   * Оценка совпадения с категорией
   */
  private scoreCategoryMatch(category: string, query: string): number {
    const lowerCategory = category.toLowerCase();

    if (lowerCategory === query) {
      return 1.0; // Точное совпадение
    }

    if (lowerCategory.includes(query) || query.includes(lowerCategory)) {
      return 0.8; // Частичное совпадение
    }

    return 0;
  }

  /**
   * Найти совпадение в тегах
   */
  private findTagMatch(tags: string[], query: string): { tag: string; score: number } | undefined {
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();

      if (lowerTag === query) {
        return { tag, score: 0.9 }; // Точное совпадение тега
      }

      if (lowerTag.includes(query)) {
        return { tag, score: 0.7 }; // Частичное совпадение тега
      }

      if (query.includes(lowerTag)) {
        return { tag, score: 0.6 }; // Query содержит тег
      }
    }

    return undefined;
  }
}
