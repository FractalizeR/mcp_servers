/**
 * Стратегия поиска по имени инструмента
 *
 * Алгоритм:
 * - Точное совпадение: score = 1.0
 * - Начинается с query: score = 0.8
 * - Содержит query: score = 0.5
 * - Case-insensitive
 *
 * Responsibilities:
 * - Поиск по полному имени tool
 * - Поиск по токенам имени
 * - Оценка релевантности совпадения
 */

import type { ISearchStrategy } from './search-strategy.interface.js';
import type { SearchResult, StaticToolIndex } from '../types.js';

/**
 * Стратегия поиска по имени
 */
export class NameSearchStrategy implements ISearchStrategy {
  search(query: string, tools: StaticToolIndex[]): SearchResult[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const tool of tools) {
      const name = tool.name.toLowerCase();

      // Проверка полного имени
      const nameScore = this.scoreNameMatch(name, lowerQuery);
      if (nameScore > 0) {
        results.push({
          toolName: tool.name,
          score: nameScore,
          matchReason: this.getMatchReason(name, lowerQuery, nameScore),
          strategyType: 'name',
        });
        continue; // Если нашли в имени, не проверяем токены
      }

      // Проверка токенов имени
      const tokenScore = this.scoreTokenMatch(tool.nameTokens, lowerQuery);
      if (tokenScore > 0) {
        results.push({
          toolName: tool.name,
          score: tokenScore,
          matchReason: `Token match in name`,
          strategyType: 'name',
        });
      }
    }

    return results;
  }

  /**
   * Оценка совпадения с полным именем
   */
  private scoreNameMatch(name: string, query: string): number {
    if (name === query) {
      return 1.0; // Точное совпадение
    }

    if (name.startsWith(query)) {
      return 0.8; // Начинается с query
    }

    if (name.includes(query)) {
      return 0.5; // Содержит query
    }

    return 0;
  }

  /**
   * Оценка совпадения с токенами
   */
  private scoreTokenMatch(tokens: string[], query: string): number {
    for (const token of tokens) {
      if (token === query) {
        return 0.9; // Точное совпадение токена
      }

      if (token.startsWith(query)) {
        return 0.7; // Токен начинается с query
      }

      if (token.includes(query)) {
        return 0.4; // Токен содержит query
      }
    }

    return 0;
  }

  /**
   * Получить описание причины совпадения
   */
  private getMatchReason(_name: string, _query: string, score: number): string {
    if (score === 1.0) {
      return 'Exact name match';
    }

    if (score === 0.8) {
      return 'Name starts with query';
    }

    if (score === 0.5) {
      return 'Name contains query';
    }

    return 'Name match';
  }
}
